//
//  ExpenseItemFormView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI
import Combine

struct ExpenseItemFormView: View {
    @Environment(\.dismiss) var dismiss
    let item: ExpenseItem?
    let onSave: (ExpenseItem) -> Void
    
    @State private var selectedExpenseTypeId: Int?
    @State private var amount = ""
    @State private var year: Int
    @State private var month: Int
    @State private var note = ""
    @State private var expenseTypes: [ExpenseType] = []
    @State private var isLoading = false
    @State private var isLoadingTypes = false
    @State private var errorMessage: String?
    @State private var cancellables = Set<AnyCancellable>()
    
    init(
        item: ExpenseItem?,
        preselectedExpenseTypeId: Int? = nil,
        preselectedYear: Int? = nil,
        preselectedMonth: Int? = nil,
        onSave: @escaping (ExpenseItem) -> Void
    ) {
        self.item = item
        self.onSave = onSave
        
        let calendar = Calendar.current
        let now = Date()
        _selectedExpenseTypeId = State(initialValue: preselectedExpenseTypeId)
        _year = State(initialValue: preselectedYear ?? calendar.component(.year, from: now))
        _month = State(initialValue: preselectedMonth ?? calendar.component(.month, from: now))
    }
    
    var isEditing: Bool {
        item != nil
    }
    
    var isValid: Bool {
        selectedExpenseTypeId != nil && !amount.isEmpty && Double(amount) != nil
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Expense Type") {
                    if isLoadingTypes {
                        HStack {
                            ProgressView()
                            Text("Loading expense types...")
                                .foregroundColor(.gray)
                        }
                    } else if expenseTypes.isEmpty {
                        Text("No expense types available")
                            .foregroundColor(.gray)
                    } else {
                        NavigationLink(destination: ExpenseTypePickerView(
                            expenseTypes: expenseTypes,
                            selectedExpenseTypeId: $selectedExpenseTypeId
                        )) {
                            HStack {
                                if let selectedId = selectedExpenseTypeId,
                                   let selectedType = expenseTypes.first(where: { $0.id == selectedId }) {
                                    Text(selectedType.icon)
                                        .font(.title3)
                                    Text(selectedType.name)
                                        .foregroundColor(.primary)
                                } else {
                                    Text("Select an expense type")
                                        .foregroundColor(.gray)
                                }
                            }
                        }
                    }
                }
                
                Section("Expense Details") {
                    HStack {
                        Text("$")
                        TextField("Amount", text: $amount)
                            .keyboardType(.decimalPad)
                    }
                    
                    Picker("Year", selection: $year) {
                        ForEach((2020...2030).reversed(), id: \.self) { y in
                            Text(String(y)).tag(y)
                        }
                    }
                    
                    Picker("Month", selection: $month) {
                        ForEach(1...12, id: \.self) { m in
                            Text(monthName(m)).tag(m)
                        }
                    }
                    
                    TextField("Note (Optional)", text: $note)
                }
                
                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit Expense" : "New Expense")
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
                            saveItem()
                        }
                        .disabled(!isValid)
                    }
                }
            }
            .onAppear {
                loadExpenseTypes()
                
                if let item = item {
                    selectedExpenseTypeId = item.expenseTypeId
                    amount = item.amount
                    year = item.year
                    month = item.month
                    note = item.note
                }
            }
        }
    }
    
    private func loadExpenseTypes() {
        isLoadingTypes = true
        
        ExpenseTypeService.shared.getExpenseTypes()
            .receive(on: DispatchQueue.main)
            .sink { completion in
                isLoadingTypes = false
                if case .failure(let error) = completion {
                    handleError(error)
                }
            } receiveValue: { response in
                expenseTypes = response.expenseTypes
            }
            .store(in: &cancellables)
    }
    
    private func saveItem() {
        guard let expenseTypeId = selectedExpenseTypeId else { return }
        
        isLoading = true
        errorMessage = nil
        
        let request = CreateExpenseItemRequest(
            billPaymentId: nil,
            billTypeId: nil,
            expenseTypeId: expenseTypeId,
            year: year,
            month: month,
            amount: amount,
            note: note.isEmpty ? nil : note
        )
        
        let publisher: AnyPublisher<ExpenseItem, APIError>
        if let item = item {
            publisher = ExpenseItemService.shared.updateExpenseItem(id: item.id, request: request)
        } else {
            publisher = ExpenseItemService.shared.createExpenseItem(request: request)
        }
        
        publisher
            .receive(on: DispatchQueue.main)
            .sink { completion in
                isLoading = false
                if case .failure(let error) = completion {
                    handleError(error)
                }
            } receiveValue: { savedItem in
                onSave(savedItem)
                dismiss()
            }
            .store(in: &cancellables)
    }
    
    private func monthName(_ month: Int) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM"
        let date = Calendar.current.date(from: DateComponents(year: 2024, month: month, day: 1)) ?? Date()
        return formatter.string(from: date)
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

// MARK: - Expense Type Picker View
struct ExpenseTypePickerView: View {
    @Environment(\.dismiss) var dismiss
    let expenseTypes: [ExpenseType]
    @Binding var selectedExpenseTypeId: Int?
    
    var body: some View {
        List {
            ForEach(expenseTypes) { type in
                Button(action: {
                    selectedExpenseTypeId = type.id
                    dismiss()
                }) {
                    HStack(spacing: 12) {
                        Text(type.icon)
                            .font(.system(size: 28))
                            .frame(width: 50, height: 50)
                            .background(Color(hex: type.color).opacity(0.2))
                            .cornerRadius(10)
                        
                        Text(type.name)
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Spacer()
                        
                        if selectedExpenseTypeId == type.id {
                            Image(systemName: "checkmark")
                                .foregroundColor(Color("AccentColor"))
                                .fontWeight(.semibold)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("Select Expense Type")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ExpenseItemFormView_Previews: PreviewProvider {
    static var previews: some View {
        ExpenseItemFormView(item: nil) { _ in }
    }
}
