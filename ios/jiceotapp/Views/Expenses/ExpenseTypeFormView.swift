//
//  ExpenseTypeFormView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI
import Combine

struct ExpenseTypeFormView: View {
    @Environment(\.dismiss) var dismiss
    let type: ExpenseType?
    let onSave: (ExpenseType) -> Void
    
    @State private var name = ""
    @State private var icon = "💰"
    @State private var color = "#6366F1"
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingIconPicker = false
    @State private var showingColorPicker = false
    @State private var cancellables = Set<AnyCancellable>()
    
    var isEditing: Bool {
        type != nil
    }
    
    var isValid: Bool {
        !name.isEmpty
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Basic Information") {
                    TextField("Name", text: $name)
                    
                    HStack {
                        Text("Icon")
                        Spacer()
                        Button(action: {
                            showingIconPicker = true
                        }) {
                            Text(icon)
                                .font(.system(size: 32))
                                .frame(width: 50, height: 50)
                                .background(Color(hex: color).opacity(0.2))
                                .cornerRadius(10)
                        }
                    }
                    
                    HStack {
                        Text("Color")
                        Spacer()
                        Button(action: {
                            showingColorPicker = true
                        }) {
                            Circle()
                                .fill(Color(hex: color))
                                .frame(width: 30, height: 30)
                        }
                    }
                }
                
                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit Expense Type" : "New Expense Type")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    if isLoading {
                        ProgressView()
                    } else {
                        Button("Save") {
                            saveType()
                        }
                        .disabled(!isValid)
                    }
                }
            }
            .sheet(isPresented: $showingIconPicker) {
                IconPickerView(selectedIcon: $icon)
            }
            .sheet(isPresented: $showingColorPicker) {
                ColorPickerView(selectedColor: $color)
            }
            .onAppear {
                if let type = type {
                    name = type.name
                    icon = type.icon
                    color = type.color
                }
            }
        }
    }
    
    private func saveType() {
        isLoading = true
        errorMessage = nil
        
        let request = CreateExpenseTypeRequest(
            name: name,
            icon: icon,
            color: color
        )
        
        let publisher: AnyPublisher<ExpenseType, APIError>
        if let type = type {
            publisher = ExpenseTypeService.shared.updateExpenseType(id: type.id, request: request)
        } else {
            publisher = ExpenseTypeService.shared.createExpenseType(request: request)
        }
        
        publisher
            .receive(on: DispatchQueue.main)
            .sink { completion in
                isLoading = false
                if case .failure(let error) = completion {
                    handleError(error)
                }
            } receiveValue: { savedType in
                onSave(savedType)
                dismiss()
            }
            .store(in: &cancellables)
    }
    
    private func handleError(_ error: APIError) {
        switch error {
        case .serverError(let message):
            errorMessage = message
        case .networkError:
            errorMessage = "Network error. Please try again."
        default:
            errorMessage = "An error occurred. Please try again."
        }
    }
}

struct ExpenseTypeFormView_Previews: PreviewProvider {
    static var previews: some View {
        ExpenseTypeFormView(type: nil) { _ in }
    }
}
