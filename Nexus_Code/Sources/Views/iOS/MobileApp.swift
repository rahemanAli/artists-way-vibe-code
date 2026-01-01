import SwiftUI
import SwiftData

// Ideally this might be shared or a separate target. 
// For this structure, we assume a separate App struct for the iOS Target or #if os(iOS) logic.
// Here is the struct assuming it's the main entry for the iOS target.

struct NexusMobileApp: App {
    let container: ModelContainer
    
    init() {
        self.container = DataController.shared.container
    }
    
    var body: some Scene {
        WindowGroup {
            MobileMainView()
                .modelContainer(container)
        }
    }
}

struct MobileMainView: View {
    var body: some View {
        TabView {
            MobileCaptureView()
                .tabItem {
                    Label("Capture", systemImage: "plus.circle.fill")
                }
            
            MobileListView()
                .tabItem {
                    Label("Next Actions", systemImage: "list.bullet")
                }
        }
    }
}
