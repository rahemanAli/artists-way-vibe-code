import SwiftUI
import SwiftData

struct ProcessingView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(filter: #Predicate<Item> { $0.stateRaw == "inbox" }, sort: \Item.createdAt, order: .forward)
    private var inboxItems: [Item]
    
    @State private var selectedItem: Item?
    
    var body: some View {
        NavigationSplitView {
            List(selection: $selectedItem) {
                ForEach(inboxItems) { item in
                    NavigationLink(value: item) {
                        VStack(alignment: .leading) {
                            Text(item.content)
                                .lineLimit(1)
                                .font(.headline)
                            Text(item.createdAt.formatted())
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Inbox")
        } detail: {
            if let item = selectedItem {
                ProcessItemView(item: item)
            } else {
                Text("Select an item to process")
                    .foregroundStyle(.secondary)
            }
        }
    }
}

struct ProcessItemView: View {
    @Bindable var item: Item
    @State private var isDeferring = false
    @State private var deferDate = Date()
    @State private var showingCalendarAlert = false
    @State private var calendarAlertMessage = ""
    @StateObject private var calendarManager = CalendarManager.shared
    
    var body: some View {
        Form {
            Section(header: Text("Content")) {
                TextField("Content", text: $item.content, axis: .vertical)
                    .font(.title2)
                
                Picker("Type", selection: $item.type) {
                    Text("Task").tag(ItemType.task)
                    Text("Note").tag(ItemType.note)
                    Text("Reference").tag(ItemType.reference)
                }
                .pickerStyle(.segmented)
            }
            
            Section(header: Text("Actions")) {
                HStack {
                    Button(action: { WorkflowManager.process(item: item, action: .doItNow) }) {
                        Label("Do (<2m)", systemImage: "bolt.fill")
                    }
                    
                    Button(action: { WorkflowManager.process(item: item, action: .moveToEngaged) }) {
                        Label("Next Action", systemImage: "arrow.right.circle.fill")
                    }
                    
                    Button(action: { WorkflowManager.process(item: item, action: .fileReference) }) {
                        Label("Reference", systemImage: "folder")
                    }
                }
                .buttonStyle(.borderedProminent)
            }
            
            Section(header: Text("Defer / Schedule")) {
                DatePicker("Defer Date & Time", selection: $deferDate, displayedComponents: [.date, .hourAndMinute])
                
                Toggle("Remind me 1 hour before", isOn: $item.isReminderEnabled)
                
                Button("Defer Item") {
                    WorkflowManager.process(item: item, action: .deferIt(deferDate))
                }
                
                Button(action: {
                    Task {
                        let success = await calendarManager.addEvent(title: item.content, date: deferDate)
                        calendarAlertMessage = success ? "Added to Calendar!" : "Failed to add to Calendar. Check Permissions."
                        showingCalendarAlert = true
                        
                        if success {
                            WorkflowManager.process(item: item, action: .deferIt(deferDate))
                        }
                    }
                }) {
                    Label("Add to Calendar", systemImage: "calendar.badge.plus")
                }
                
                Button(action: {
                    Task {
                        // Use default notes or empty
                        let success = await calendarManager.addReminder(title: item.content, date: deferDate, notes: "Created via Nexus")
                        calendarAlertMessage = success ? "Added to Reminders!" : "Failed to add to Reminders. Check Permissions."
                        showingCalendarAlert = true
                        
                        if success {
                            WorkflowManager.process(item: item, action: .deferIt(deferDate))
                        }
                    }
                }) {
                    Label("Add to Reminders", systemImage: "list.bullet.clipboard")
                }
            }
        }
        .padding()
        .navigationTitle("Process Item")
        .alert(calendarAlertMessage, isPresented: $showingCalendarAlert) {
            Button("OK", role: .cancel) { }
        }
    }
}

