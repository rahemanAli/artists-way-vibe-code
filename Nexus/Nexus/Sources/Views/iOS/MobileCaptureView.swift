import SwiftUI
import SwiftData

struct MobileCaptureView: View {
    @Environment(\.modelContext) var modelContext
    @State private var text: String = ""
    @FocusState private var isFocused: Bool
    
    var body: some View {
        VStack {
            Spacer()
            
            Text("Capture")
                .font(.largeTitle)
                .fontWeight(.bold)
                .opacity(0.3)
            
            TextField("What's on your mind?", text: $text, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .padding()
                .focused($isFocused)
            
            Button(action: saveItem) {
                Circle()
                    .fill(Color.accentColor)
                    .frame(width: 80, height: 80)
                    .overlay(
                        Image(systemName: "arrow.up")
                            .foregroundColor(.white)
                            .font(.title)
                    )
                    .shadow(radius: 10)
            }
            .padding(.bottom, 50)
            
            Spacer()
        }
        .padding()
        .background(Color.gray.opacity(0.1))
    }
    
    private func saveItem() {
        guard !text.isEmpty else { return }
        
        // Mobile capture defaults to Inbox
        let newItem = Item(content: text, type: .note, state: .inbox)
        modelContext.insert(newItem)
        
        text = ""
        isFocused = false
    }
}
