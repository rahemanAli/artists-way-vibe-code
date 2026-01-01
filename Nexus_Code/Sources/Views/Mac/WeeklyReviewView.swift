import SwiftUI
import SwiftData

struct WeeklyReviewView: View {
    @State private var step: ReviewStep = .clearInbox
    @Environment(\.dismiss) var dismiss
    
    enum ReviewStep: Int, CaseIterable {
        case clearInbox = 0
        case reviewWaiting = 1
        case reviewProjects = 2
        case selectFocus = 3
        case complete = 4
    }
    
    var body: some View {
        VStack {
            ProgressView(value: Double(step.rawValue), total: Double(ReviewStep.allCases.count - 1))
                .padding()
            
            Spacer()
            
            switch step {
            case .clearInbox:
                Text("Step 1: Get to Inbox Zero")
                    .font(.title)
                ProcessingView() // Re-use processing view
            case .reviewWaiting:
                Text("Step 2: Review 'Waiting For'")
                    .font(.title)
                // In a real app, filter for "Waiting For" context
                Text("Check items you are waiting on...")
            case .reviewProjects:
                Text("Step 3: Review Projects")
                    .font(.title)
                // Scan list of engaged items/projects logic
                Text("Are your projects moving forward?")
            case .selectFocus:
                Text("Step 4: Select Focus for Next Week")
                    .font(.title)
            case .complete:
                Text("Weekly Review Complete!")
                    .font(.title)
                    .foregroundColor(.green)
                Button("Done") {
                    dismiss()
                }
            }
            
            Spacer()
            
            HStack {
                if step.rawValue > 0 && step != .complete {
                    Button("Back") {
                        withAnimation {
                            step = ReviewStep(rawValue: step.rawValue - 1) ?? .clearInbox
                        }
                    }
                }
                
                Spacer()
                
                if step != .complete {
                    Button("Next") {
                        withAnimation {
                            step = ReviewStep(rawValue: step.rawValue + 1) ?? .complete
                        }
                    }
                    .keyboardShortcut(.return, modifiers: .command)
                }
            }
            .padding()
        }
        .frame(minWidth: 600, minHeight: 500)
        .padding()
    }
}
