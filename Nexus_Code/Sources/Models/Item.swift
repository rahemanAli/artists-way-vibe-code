import Foundation
import SwiftData

enum ItemType: String, Codable {
    case task
    case note
    case reference
}

enum ItemState: String, Codable, Comparable {
    case inbox
    case processed
    case engaged
    case archived
    
    // implement Comparable for sorting
    static func < (lhs: ItemState, rhs: ItemState) -> Bool {
        switch (lhs, rhs) {
        case (.inbox, .processed), (.inbox, .engaged), (.inbox, .archived): return true
        case (.processed, .engaged), (.processed, .archived): return true
        case (.engaged, .archived): return true
        default: return false
        }
    }
}

@Model
final class Item {
    var id: UUID
    var content: String
    var createdAt: Date
    var modifiedAt: Date
    var type: ItemType
    var state: ItemState
    
    // Task specific
    var isQuick: Bool = false // Two-minute rule tag
    var deferDate: Date?
    var completedAt: Date?
    
    // Contexts (Relationships)
    @Relationship(inverse: \Context.items)
    var contexts: [Context] = []
    
    // Zettelkasten Links (Bi-directional)
    // SwiftData bi-directional self-referencing relationships can be tricky, 
    // often modeled with a separate Link entity or inverse relationships.
    // For simplicity efficiently, we will use a separate Link model to handle complex graph edges if needed,
    // but here we try direct relationship.
    @Relationship(deleteRule: .nullify) 
    var relatedItems: [Item] = []
    
    // Inverse for relatedItems logic is manual in many implementations or requires explicit inverse.
    // We will stick to a simple list for "outgoing" links for now, or bi-directional if explicitly set.
    
    init(content: String, type: ItemType = .note, state: ItemState = .inbox) {
        self.id = UUID()
        self.content = content
        self.createdAt = Date()
        self.modifiedAt = Date()
        self.type = type
        self.state = state
    }
}
