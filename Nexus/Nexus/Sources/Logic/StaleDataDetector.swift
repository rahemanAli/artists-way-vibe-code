import Foundation
import SwiftData

class StaleDataDetector {
    
    static func findStaleItems(in items: [Item], thresholdDays: Int = 30) -> [Item] {
        let calendar = Calendar.current
        let now = Date()
        
        return items.filter { item in
            // Only care about engaged or processed items, not archived or inbox
            guard item.state == .engaged || item.state == .processed else { return false }
            
            // Calculate days since last modification
            if let days = calendar.dateComponents([.day], from: item.modifiedAt, to: now).day,
               days > thresholdDays {
                return true
            }
            return false
        }
    }
    
    static func isStale(_ item: Item, thresholdDays: Int = 30) -> Bool {
        let calendar = Calendar.current
        let now = Date()
         if let days = calendar.dateComponents([.day], from: item.modifiedAt, to: now).day,
            days > thresholdDays {
             return true
         }
        return false
    }
}
