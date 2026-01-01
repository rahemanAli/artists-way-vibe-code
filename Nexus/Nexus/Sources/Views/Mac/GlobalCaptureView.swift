import SwiftUI
#if os(macOS)
import AppKit
#endif
import SwiftData

struct GlobalCaptureView: View {
    @Environment(\.dismiss) var dismiss
    @Environment(\.modelContext) var modelContext
    
    @State private var inputText: String = ""
    
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Image(systemName: "plus.circle.fill")
                    .foregroundColor(.accentColor)
                
                TextField("Capture idea... (-t task, -n note)", text: $inputText)
                    .textFieldStyle(.plain)
                    .font(.title3)
                    .onSubmit {
                        submitItem()
                    }
                
                Button("Save") {
                    submitItem()
                }
                .keyboardShortcut(.return, modifiers: .command)
            }
            .padding()
            #if os(macOS)
            .background(VisualEffectView(material: .popover, blendingMode: .behindWindow))
            #else
            .background(UnrelatedEffectView())
            #endif
        }
        .frame(width: 600)
        .cornerRadius(12)
    }
    
    private func submitItem() {
        guard !inputText.isEmpty else { return }
        
        let trimmed = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        var content = trimmed
        var type: ItemType = .note // Default
        
        // Simple parsing
        if content.hasSuffix("-t") || content.contains("-t ") {
            type = .task
            content = content.replacingOccurrences(of: "-t", with: "").trimmingCharacters(in: .whitespaces)
        } else if content.hasSuffix("-n") || content.contains("-n ") {
            type = .note
            content = content.replacingOccurrences(of: "-n", with: "").trimmingCharacters(in: .whitespaces)
        }
        
        let newItem = Item(content: content, type: type, state: .inbox)
        modelContext.insert(newItem)
        
        inputText = ""
        dismiss()
    }
}

#if os(macOS)
struct VisualEffectView: NSViewRepresentable {
    let material: NSVisualEffectView.Material
    let blendingMode: NSVisualEffectView.BlendingMode
    
    func makeNSView(context: NSViewRepresentableContext<VisualEffectView>) -> NSVisualEffectView {
        let visualEffectView = NSVisualEffectView()
        visualEffectView.material = material
        visualEffectView.blendingMode = blendingMode
        visualEffectView.state = .active
        return visualEffectView
    }

    func updateNSView(_ nsView: NSVisualEffectView, context: NSViewRepresentableContext<VisualEffectView>) {
        nsView.material = material
        nsView.blendingMode = blendingMode
    }
}
#else
struct UnrelatedEffectView: View {
    var body: some View {
        Color.gray.opacity(0.1)
    }
}
#endif
