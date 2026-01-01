import SwiftUI
import SwiftData

struct OverviewView: View {
    @Query(filter: #Predicate<Item> { $0.stateRaw == "engaged" && $0.typeRaw == "task" }, sort: \Item.deferDate, order: .forward)
    private var tasks: [Item]
    
    @State private var viewMode: ViewMode = .list
    @State private var selectedDate: Date = Date()
    
    enum ViewMode: String, CaseIterable {
        case list = "List"
        case calendar = "Calendar"
    }
    
    var body: some View {
        VStack {
            Picker("View Mode", selection: $viewMode) {
                ForEach(ViewMode.allCases, id: \.self) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .padding()
            
            switch viewMode {
            case .list:
                TaskListView(tasks: tasks)
            case .calendar:
                CalendarGridView(tasks: tasks, selectedDate: $selectedDate)
            }
        }
        .navigationTitle("Overview")
    }
}

struct TaskListView: View {
    var tasks: [Item]
    
    var body: some View {
        List {
            Section(header: Text("Timeline")) {
                if tasks.isEmpty {
                    ContentUnavailableView("No scheduled tasks", systemImage: "calendar.badge.exclamationmark")
                } else {
                    ForEach(tasks) { task in
                        TaskRow(task: task)
                    }
                }
            }
        }
    }
}

struct TaskRow: View {
    @Bindable var task: Item
    
    var body: some View {
        HStack {
            Button(action: {
                withAnimation {
                    task.completedAt = Date()
                    task.state = .archived
                    NotificationManager.shared.cancelNotification(for: task)
                }
            }) {
                Image(systemName: "circle")
                    .imageScale(.large)
                    .foregroundColor(.secondary)
            }
            .buttonStyle(.plain)
            
            VStack(alignment: .leading) {
                Text(task.content)
                    .strikethrough(task.completedAt != nil)
                if let date = task.deferDate {
                    Text(date.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            
            Spacer()
            
            if task.isQuick {
                Image(systemName: "bolt.fill")
                    .foregroundColor(.yellow)
            }
        }
    }
}

struct CalendarGridView: View {
    let tasks: [Item]
    @Binding var selectedDate: Date
    @State private var currentMonth: Date = Date()
    
    private let calendar = Calendar.current
    private let columns = Array(repeating: GridItem(.flexible()), count: 7)
    
    var body: some View {
        VStack {
            // Month Header
            HStack {
                Button(action: { changeMonth(by: -1) }) {
                    Image(systemName: "chevron.left")
                }
                Spacer()
                Text(monthYearString(for: currentMonth))
                    .font(.headline)
                Spacer()
                Button(action: { changeMonth(by: 1) }) {
                    Image(systemName: "chevron.right")
                }
            }
            .padding()
            
            // Days of Week
            HStack {
                ForEach(calendar.shortWeekdaySymbols, id: \.self) { day in
                    Text(day)
                        .font(.caption)
                        .frame(maxWidth: .infinity)
                }
            }
            
            // Days Grid
            LazyVGrid(columns: columns, spacing: 15) {
                ForEach(daysInMonth(), id: \.self) { date in
                    if let date = date {
                        DayCell(date: date, tasks: tasksForDate(date), isSelected: calendar.isDate(date, inSameDayAs: selectedDate))
                            .onTapGesture {
                                selectedDate = date
                            }
                    } else {
                        Color.clear
                    }
                }
            }
            .padding()
            
            Divider()
            
            // Selected Day Tasks
            VStack(alignment: .leading) {
                Text(selectedDate.formatted(date: .complete, time: .omitted))
                    .font(.headline)
                    .padding(.top)
                
                let dayTasks = tasksForDate(selectedDate)
                if dayTasks.isEmpty {
                    ContentUnavailableView("No tasks for this day", systemImage: "list.bullet.clipboard")
                } else {
                    List(dayTasks) { task in
                        TaskRow(task: task)
                    }
                }
            }
        }
    }
    
    private func changeMonth(by value: Int) {
        if let newMonth = calendar.date(byAdding: .month, value: value, to: currentMonth) {
            currentMonth = newMonth
        }
    }
    
    private func monthYearString(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: date)
    }
    
    private func daysInMonth() -> [Date?] {
        guard let range = calendar.range(of: .day, in: .month, for: currentMonth),
              let firstDayOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: currentMonth)) else {
            return []
        }
        
        let firstWeekday = calendar.component(.weekday, from: firstDayOfMonth)
        let offset = firstWeekday - calendar.firstWeekday
        
        var days: [Date?] = Array(repeating: nil, count: offset >= 0 ? offset : offset + 7)
        
        for day in 1...range.count {
            if let date = calendar.date(byAdding: .day, value: day - 1, to: firstDayOfMonth) {
                days.append(date)
            }
        }
        
        return days
    }
    
    private func tasksForDate(_ date: Date) -> [Item] {
        tasks.filter { task in
            guard let tasksDate = task.deferDate else { return false }
            return calendar.isDate(tasksDate, inSameDayAs: date)
        }
    }
}

struct DayCell: View {
    let date: Date
    let tasks: [Item]
    let isSelected: Bool
    private let calendar = Calendar.current
    
    var body: some View {
        VStack {
            Text("\(calendar.component(.day, from: date))")
                .font(.body)
                .fontWeight(isSelected ? .bold : .regular)
                .foregroundColor(isSelected ? .white : .primary)
                .frame(width: 30, height: 30)
                .background(isSelected ? Circle().fill(Color.accentColor) : Circle().fill(Color.clear))
            
            HStack(spacing: 2) {
                ForEach(tasks.prefix(3)) { _ in
                    Circle()
                        .fill(isSelected ? .white : Color.accentColor)
                        .frame(width: 4, height: 4)
                }
            }
        }
        .frame(height: 40)
        .frame(maxWidth: .infinity)
        .contentShape(Rectangle()) // Make entire area tappable
    }
}
