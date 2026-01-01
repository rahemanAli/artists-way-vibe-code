import Foundation
import SwiftData

// Explicit link model to better support Zettelkasten graph logic if we need metadata on links
// (e.g., "refutes", "supports", "relates to")
@Model
final class Link {
    var createdAt: Date
    
    @Relationship
    var sourceItem: Item?
    
    @Relationship
    var targetItem: Item?
    
    init(source: Item, target: Item) {
        self.createdAt = Date()
        self.sourceItem = source
        self.targetItem = target
    }
}
