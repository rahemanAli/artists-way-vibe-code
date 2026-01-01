import SwiftUI
import SwiftData

struct MobileListView: View {
    // Mobile view focuses on "Next Actions" (Engaged)
    @Query(filter: #Predicate<Item> { $0.state == .engaged }, sort: \Item.modifiedAt, order: .reverse)
    private var tasks: [Item]
    
    var body: some View {
        NavigationStack {
            List {
                Section(header: Text("Next Actions")) {
                    ForEach(tasks) { task in
                        HStack {
                            if task.isQuick {
                                Image(systemName: "bolt.fill")
                                    .foregroundColor(.yellow)
                            }
                            Text(task.content)
                        }
                    }
                }
            }
            .navigationTitle("Nexus Lite")
        }
    }
}
