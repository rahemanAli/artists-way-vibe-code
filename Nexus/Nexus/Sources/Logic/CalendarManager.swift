import Foundation
import EventKit
import Combine

@MainActor
class CalendarManager: ObservableObject {
    static let shared = CalendarManager()
    private let store = EKEventStore()
    
    @Published var isGranted = false
    @Published var isRemindersGranted = false
    
    init() {
        Task {
            await checkStatus()
        }
    }
    
    func checkStatus() async {
        let status = EKEventStore.authorizationStatus(for: .event)
        let reminderStatus = EKEventStore.authorizationStatus(for: .reminder)
        
        if #available(macOS 14.0, iOS 17.0, *) {
             isGranted = (status == .fullAccess || status == .writeOnly)
             isRemindersGranted = (reminderStatus == .fullAccess || reminderStatus == .writeOnly)
        } else {
             isGranted = (status == .authorized)
             isRemindersGranted = (reminderStatus == .authorized)
        }
    }
    
    func requestAccess() async -> Bool {
        do {
            let granted = try await store.requestFullAccessToEvents()
            isGranted = granted
            return granted
        } catch {
            print("Calendar Access Error: \(error.localizedDescription)")
            return false
        }
    }
    
    func requestRemindersAccess() async -> Bool {
        do {
             let granted = try await store.requestFullAccessToReminders()
             isRemindersGranted = granted
             return granted
        } catch {
             print("Reminders Access Error: \(error.localizedDescription)")
             return false
        }
    }
    
    func addEvent(title: String, date: Date) async -> Bool {
        if !isGranted {
             let granted = await requestAccess()
             guard granted else { return false }
        }
        
        let event = EKEvent(eventStore: store)
        event.title = title
        event.startDate = date
        event.endDate = date.addingTimeInterval(3600) // Default 1 hour duration
        event.calendar = store.defaultCalendarForNewEvents
        
        do {
            try store.save(event, span: .thisEvent)
            print("Event saved to calendar")
            return true
        } catch {
            print("Failed to save event: \(error.localizedDescription)")
            return false
        }
    }
    
    func addReminder(title: String, date: Date, notes: String?) async -> Bool {
        if !isRemindersGranted {
            let granted = await requestRemindersAccess()
            guard granted else { return false }
        }
        
        let reminder = EKReminder(eventStore: store)
        reminder.title = title
        reminder.notes = notes
        
        let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        reminder.dueDateComponents = components
        
        // Add alarm 15 minutes before (15 * 60 = 900 seconds)
        reminder.alarms = [EKAlarm(relativeOffset: -900)]
        reminder.calendar = store.defaultCalendarForNewReminders()
        
        do {
            try store.save(reminder, commit: true)
            print("Reminder saved")
            return true
        } catch {
            print("Failed to save reminder: \(error.localizedDescription)")
            return false
        }
    }
}
