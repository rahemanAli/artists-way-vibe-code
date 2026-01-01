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
    var typeRaw: String
    var stateRaw: String
    
    // Computed wrappers for type-safety
    var type: ItemType {
        get { ItemType(rawValue: typeRaw) ?? .note }
        set { typeRaw = newValue.rawValue }
    }
    
    var state: ItemState {
        get { ItemState(rawValue: stateRaw) ?? .inbox }
        set { stateRaw = newValue.rawValue }
    }
    
    // Task specific
    var isQuick: Bool = false // Two-minute rule tag
    var deferDate: Date?
    var isReminderEnabled: Bool = false // Remind 1h before
    var completedAt: Date?
    
    // Contexts (Relationships)
    @Relationship(inverse: \Context.items)
    var contexts: [Context] = []
    
    // Zettelkasten Links (Bi-directional)
    @Relationship(deleteRule: .nullify) 
    var relatedItems: [Item] = []
    
    init(content: String, type: ItemType = .note, state: ItemState = .inbox) {
        self.id = UUID()
        self.content = content
        self.createdAt = Date()
        self.modifiedAt = Date()
        self.typeRaw = type.rawValue
        self.stateRaw = state.rawValue
    }
}
