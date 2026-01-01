import SwiftUI
import SwiftData

struct ArchiveView: View {
    @Query(filter: #Predicate<Item> { $0.stateRaw == "archived" }, sort: \Item.modifiedAt, order: .reverse)
    private var archivedItems: [Item]
    
    var body: some View {
        List {
            if archivedItems.isEmpty {
                ContentUnavailableView("No Archived Items", systemImage: "archivebox")
            } else {
                ForEach(archivedItems) { item in
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        
                        VStack(alignment: .leading) {
                            Text(item.content)
                                .strikethrough()
                                .foregroundColor(.secondary)
                            
                            if let completed = item.completedAt {
                                Text("Completed: \(completed.formatted())")
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            } else {
                                Text("Archived: \(item.modifiedAt.formatted())")
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            }
                        }
                        
                        Spacer()
                        
                        // Option to un-archive?
                        Button("Restore") {
                            withAnimation {
                                item.state = .engaged // Move back to Next Actions
                                item.completedAt = nil
                            }
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                    }
                }
                .onDelete(perform: deleteItems)
            }
        }
        .navigationTitle("Archive")
    }
    
    @Environment(\.modelContext) private var modelContext
    
    private func deleteItems(offsets: IndexSet) {
        withAnimation {
            for index in offsets {
                modelContext.delete(archivedItems[index])
            }
        }
    }
}
