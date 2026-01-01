import SwiftUI
import SwiftData

@main
struct NexusApp: App {
    let container: ModelContainer
    
    @State private var isCapturePresented: Bool = false
    
    init() {
        self.container = DataController.shared.container
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .modelContainer(container)
                .background(
                    // Hidden view to handle global shortcut listener if focused, 
                    // though deeper global hotkeys often need AppKit/NSEvent monitoring.
                    // For SwiftUI native, we usually add a command or .keyboardShortcut
                    Color.clear
                        .focusable()
                )
                .sheet(isPresented: $isCapturePresented) {
                    GlobalCaptureView()
                        .modelContext(container.mainContext)
                }
        }
        .commands {
            CommandMenu("Actions") {
                Button("Quick Capture") {
                    isCapturePresented = true
                }
                .keyboardShortcut("k", modifiers: .command)
            }
        }
    }
}

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var navigationSelection: String? = "dashboard"
    
    var body: some View {
        NavigationSplitView {
            List(selection: $navigationSelection) {
                Label("Dashboard", systemImage: "sidebar.left").tag("dashboard")
                Label("Inbox", systemImage: "tray").tag("inbox")
                Label("Weekly Review", systemImage: "calendar.badge.clock").tag("review")
            }
            .listStyle(.sidebar)
            .navigationTitle("Nexus")
        } detail: {
            switch navigationSelection {
            case "dashboard":
                DashboardView()
            case "inbox":
                ProcessingView()
            case "review":
                Text("Weekly Review Wizard (Coming Soon)")
            default:
                DashboardView()
            }
        }
    }
}
