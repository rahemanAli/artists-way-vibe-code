import Foundation
import SwiftData

enum ContextType: String, Codable {
    case energy      // e.g. High, Low
    case environment // e.g. @Phone, @Computer, @Home
    case person      // e.g. @Boss, @Spouse
}

@Model
final class Context {
    var id: UUID
    var name: String
    var type: ContextType
    var colorHex: String? // For UI customization
    
    var items: [Item]?
    
    init(name: String, type: ContextType, colorHex: String? = nil) {
        self.id = UUID()
        self.name = name
        self.type = type
        self.colorHex = colorHex
    }
}
