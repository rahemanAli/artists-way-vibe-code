import Foundation
import SwiftData

class WorkflowManager {
    
    // Core GTD State Machine
    static func process(item: Item, action: ProcessingAction) {
        switch action {
        case .doItNow:
            // "Two Minute Rule" - supposedly done immediately, then archived or marked completed
            item.state = .archived
            item.completedAt = Date()
            
        case .deferIt(let date):
            item.state = .engaged
            item.deferDate = date
            item.type = .task
            
        case .delegate(let personContext):
            item.state = .engaged
            item.contexts.append(personContext)
            item.type = .task // waiting for
            
        case .fileReference:
            item.state = .archived
            item.type = .reference
            
        case .makeProject:
            item.state = .engaged
            item.type = .task // In real GTD, this would spawn a Project object, but for now we treat as heavy task
            
        case .moveToEngaged:
             item.state = .engaged
        }
        
        item.modifiedAt = Date()
    }
    
    enum ProcessingAction {
        case doItNow
        case deferIt(Date)
        case delegate(Context)
        case fileReference
        case makeProject
        case moveToEngaged
    }
}
