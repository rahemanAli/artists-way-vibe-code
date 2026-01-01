import SwiftData
import SwiftUI

@MainActor
class DataController {
    static let shared = DataController()
    
    var container: ModelContainer
    
    init() {
        let schema = Schema([
            Item.self,
            Context.self,
            Link.self
        ])
        
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        
        do {
            container = try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }
    
    static var previewContainer: ModelContainer = {
        let schema = Schema([
            Item.self,
            Context.self,
            Link.self
        ])
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        do {
            let container = try ModelContainer(for: schema, configurations: [config])
            // Seed data if needed
            return container
        } catch {
            fatalError("Failed to create preview container: \(error)")
        }
    }()
}
