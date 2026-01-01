import SwiftUI
import SwiftData

struct DashboardView: View {
    @Environment(\.modelContext) private var modelContext
    
    // Split View State
    @State private var selectedItem: Item?
    @State private var columnVisibility = NavigationSplitViewVisibility.all
    
    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            NextActionsListView(selectedItem: $selectedItem)
                .navigationTitle("Next Actions")
        } detail: {
            if let item = selectedItem {
                ItemDetailView(item: item)
            } else {
                SlipBoxView()
            }
        }
    }
}

struct NextActionsListView: View {
    @Query(filter: #Predicate<Item> { $0.state == .engaged }, sort: \Item.modifiedAt, order: .reverse)
    private var engagedItems: [Item]
    
    @Binding var selectedItem: Item?
    
    var body: some View {
        List(selection: $selectedItem) {
            ForEach(engagedItems) { item in
                NavigationLink(value: item) {
                    HStack {
                        if item.isQuick {
                            Image(systemName: "bolt.fill")
                                .foregroundColor(.yellow)
                                .help("Quick Task (<2m)")
                        }
                        
                        Text(item.content)
                            .strikethrough(item.completedAt != nil)
                        
                        Spacer()
                        
                        if let date = item.deferDate {
                            Text(date, style: .date)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
    }
}

struct SlipBoxView: View {
    // Show Notes and References
    @Query(filter: #Predicate<Item> { ($0.type == .note || $0.type == .reference) && $0.state != .inbox }, sort: \Item.modifiedAt, order: .reverse)
    private var notes: [Item]
    
    var body: some View {
        List {
            Section(header: Text("The Slip-Box (Recent)")) {
                ForEach(notes) { note in
                    VStack(alignment: .leading) {
                        Text(note.content)
                            .font(.body)
                        Text("Modified: \(note.modifiedAt.formatted())")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Slip-Box")
    }
}

struct ItemDetailView: View {
    @Bindable var item: Item
    
    var body: some View {
        Form {
            Section(header: Text("Content")) {
                TextField("Content", text: $item.content, axis: .vertical)
                    .lineLimit(3...10)
            }
            
            Section(header: Text("Metadata")) {
                Toggle("Quick Task", isOn: $item.isQuick)
                
                Picker("Type", selection: $item.type) {
                    Text("Task").tag(ItemType.task)
                    Text("Note").tag(ItemType.note)
                    Text("Reference").tag(ItemType.reference)
                }
                
                if item.type == .task {
                    DatePicker("Defer Date", selection: Binding(
                        get: { item.deferDate ?? Date() },
                        set: { item.deferDate = $0 }
                    ), displayedComponents: .date)
                }
            }
            
            Section(header: Text("Contexts")) {
                // Implementation for adding/removing contexts would go here
                Text("Contexts management pending...")
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .navigationTitle("Details")
    }
}
