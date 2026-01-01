import UserNotifications
import Foundation
import Combine

class NotificationManager: ObservableObject {
    static let shared = NotificationManager()
    
    @Published var isGranted = false
    
    init() {
        requestAuthorization()
    }
    
    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            DispatchQueue.main.async {
                self.isGranted = granted
                if let error = error {
                    print("Notification Auth Error: \(error.localizedDescription)")
                }
            }
        }
    }
    
    func scheduleNotification(for item: Item) {
        guard let date = item.deferDate, item.stateRaw == "engaged" || item.stateRaw == "inbox" else { return }
        
        // Only schedule if reminder is enabled
        guard item.isReminderEnabled else { return }
        
        let content = UNMutableNotificationContent()
        content.title = "Upcoming Task (1h)"
        content.body = item.content
        content.sound = .default
        
        // 1 hour before
        let reminderDate = date.addingTimeInterval(-3600)
        
        let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: reminderDate)
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        
        // Use Item ID as identifier so we can cancel it later or update it
        let request = UNNotificationRequest(identifier: item.id.uuidString, content: content, trigger: trigger)
        
        let itemContent = item.content
        let itemDate = date
        
        UNUserNotificationCenter.current().add(request) { [itemContent, itemDate] error in
            if let error = error {
                print("Error scheduling notification: \(error)")
            } else {
                print("Scheduled notification for: \(itemContent) at \(itemDate)")
            }
        }
    }
    
    func cancelNotification(for item: Item) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [item.id.uuidString])
    }
}
