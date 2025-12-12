//
//  BillPaymentFormView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI
import Combine

struct BillPaymentFormView: View {
    @Environment(\.dismiss) var dismiss
    let payment: BillPayment?
    let onSave: (BillPayment) -> Void
    
    @State private var selectedBillTypeId: Int?
    @State private var amount = ""
    @State private var year: Int
    @State private var month: Int
    @State private var note = ""
    @State private var billTypes: [BillType] = []
    @State private var isLoading = false
    @State private var isLoadingBillTypes = false
    @State private var errorMessage: String?
    @State private var cancellables = Set<AnyCancellable>()
    
    init(
        payment: BillPayment?,
        preselectedBillTypeId: Int? = nil,
        preselectedAmount: String? = nil,
        preselectedYear: Int? = nil,
        preselectedMonth: Int? = nil,
        onSave: @escaping (BillPayment) -> Void
    ) {
        self.payment = payment
        self.onSave = onSave
        
        let calendar = Calendar.current
        let now = Date()
        _selectedBillTypeId = State(initialValue: preselectedBillTypeId)
        _amount = State(initialValue: preselectedAmount ?? "")
        _year = State(initialValue: preselectedYear ?? calendar.component(.year, from: now))
        _month = State(initialValue: preselectedMonth ?? calendar.component(.month, from: now))
    }
    
    var isEditing: Bool {
        payment != nil
    }
    
    var isValid: Bool {
        selectedBillTypeId != nil && !amount.isEmpty && Double(amount) != nil
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Bill Type") {
                    if isLoadingBillTypes {
                        HStack {
                            ProgressView()
                            Text("Loading bill types...")
                                .foregroundColor(.gray)
                        }
                    } else if billTypes.isEmpty {
                        Text("No bill types available")
                            .foregroundColor(.gray)
                    } else {
                        NavigationLink(destination: BillTypePickerView(
                            billTypes: billTypes,
                            selectedBillTypeId: $selectedBillTypeId
                        )) {
                            HStack {
                                if let selectedId = selectedBillTypeId,
                                   let selectedType = billTypes.first(where: { $0.id == selectedId }) {
                                    Text(selectedType.icon)
                                        .font(.title3)
                                    Text(selectedType.name)
                                        .foregroundColor(.primary)
                                } else {
                                    Text("Select a bill type")
                                        .foregroundColor(.gray)
                                }
                            }
                        }
                    }
                }
                
                Section("Payment Details") {
                    HStack {
                        Text("$")
                        TextField("Amount", text: $amount)
                            .keyboardType(.decimalPad)
                    }
                    
                    HStack {
                        Text("Date")
                        Spacer()
                        MonthYearPicker(selectedMonth: $month, selectedYear: $year)
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
            .navigationTitle(isEditing ? "Edit Payment" : "New Payment")
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
                            savePayment()
                        }
                        .disabled(!isValid)
                    }
                }
            }
            .onAppear {
                loadBillTypes()
                
                if let payment = payment {
                    selectedBillTypeId = payment.billTypeId
                    amount = payment.amount
                    year = payment.year
                    month = payment.month
                    note = payment.note
                }
            }
        }
    }
    
    private func loadBillTypes() {
        isLoadingBillTypes = true
        
        BillTypeService.shared.getBillTypes(includeStopped: false)
            .receive(on: DispatchQueue.main)
            .sink { completion in
                isLoadingBillTypes = false
                if case .failure(let error) = completion {
                    handleError(error)
                }
            } receiveValue: { response in
                billTypes = response.billTypes
            }
            .store(in: &cancellables)
    }
    
    private func savePayment() {
        guard let billTypeId = selectedBillTypeId else { return }
        
        isLoading = true
        errorMessage = nil
        
        let request = CreateBillPaymentRequest(
            billTypeId: billTypeId,
            year: year,
            month: month,
            amount: amount,
            note: note.isEmpty ? "" : note
        )
        
        let publisher: AnyPublisher<BillPayment, APIError>
        if let payment = payment {
            publisher = BillPaymentService.shared.updateBillPayment(id: payment.id, request: request)
        } else {
            publisher = BillPaymentService.shared.createBillPayment(request: request)
        }
        
        publisher
            .receive(on: DispatchQueue.main)
            .sink { completion in
                isLoading = false
                if case .failure(let error) = completion {
                    handleError(error)
                }
            } receiveValue: { savedPayment in
                onSave(savedPayment)
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

struct BillPaymentFormView_Previews: PreviewProvider {
    static var previews: some View {
        BillPaymentFormView(payment: nil) { _ in }
    }
}
