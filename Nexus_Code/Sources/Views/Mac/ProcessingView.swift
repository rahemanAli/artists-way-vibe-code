import SwiftUI
import SwiftData

struct ProcessingView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(filter: #Predicate<Item> { $0.state == .inbox }, sort: \Item.createdAt, order: .forward)
    private var inboxItems: [Item]
    
    var currentItem: Item? {
        inboxItems.first
    }
    
    var body: some View {
        VStack {
            if let item = currentItem {
                ProcessItemView(item: item)
                    .id(item.id) // Force transition when item changes
                    .transition(.opacity.combined(with: .slide))
            } else {
                EmptyInboxView()
            }
        }
        .padding()
        .frame(minWidth: 500, minHeight: 400)
    }
}

struct ProcessItemView: View {
    @Bindable var item: Item
    @State private var isDeferring = false
    @State private var deferDate = Date()
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Process Inbox")
                .font(.headline)
                .foregroundStyle(.secondary)
            
            Spacer()
            
            Text(item.content)
                .font(.system(size: 24, weight: .medium, design: .serif))
                .multilineTextAlignment(.center)
                .padding()
            
            Spacer()
            
            HStack(spacing: 20) {
                // Do It Now
                Button(action: { WorkflowManager.process(item: item, action: .doItNow) }) {
                    Label("Do (<2m)", systemImage: "bolt.fill")
                }
                .keyboardShortcut("d", modifiers: [])
                
                // Defer
                Button(action: { isDeferring = true }) {
                    Label("Defer", systemImage: "clock")
                }
                .popover(isPresented: $isDeferring) {
                    DatePicker("Defer until", selection: $deferDate, displayedComponents: [.date])
                        .padding()
                    Button("Confirm") {
                        WorkflowManager.process(item: item, action: .deferIt(deferDate))
                        isDeferring = false
                    }
                    .padding()
                }
                
                // File / Reference
                Button(action: { WorkflowManager.process(item: item, action: .fileReference) }) {
                    Label("Reference", systemImage: "folder")
                }
                
                 // Next Action (Engage)
                Button(action: { WorkflowManager.process(item: item, action: .moveToEngaged) }) {
                    Label("Next Action", systemImage: "arrow.right.circle.fill")
                }
                .keyboardShortcut(.return, modifiers: [])
            }
            .padding()
        }
    }
}

struct EmptyInboxView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "tray.fill")
                .font(.system(size: 60))
                .foregroundColor(.green)
            Text("Inbox Zero")
                .font(.title)
                .fontWeight(.bold)
            Text("You are all caught up!")
                .foregroundStyle(.secondary)
        }
    }
}
