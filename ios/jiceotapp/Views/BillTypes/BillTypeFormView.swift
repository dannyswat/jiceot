//
//  BillTypeFormView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI
import Combine

struct BillTypeFormView: View {
    @Environment(\.dismiss) var dismiss
    let billType: BillType?
    let onSave: (BillType) -> Void
    
    @State private var name = ""
    @State private var icon = "💳"
    @State private var color = "#6366F1"
    @State private var billDay = 1
    @State private var billCycle = 1
    @State private var fixedAmount = ""
    @State private var isOnDemand = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingIconPicker = false
    @State private var showingColorPicker = false
    @State private var cancellables = Set<AnyCancellable>()
    
    var isEditing: Bool {
        billType != nil
    }
    
    var isValid: Bool {
        !name.isEmpty && billDay >= 1 && billDay <= 31
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
                
                Section("Bill Type") {
                    Toggle("On-Demand Bill", isOn: $isOnDemand)
                        .onChange(of: isOnDemand) { newValue in
                            if newValue {
                                billCycle = 0
                            } else if billCycle == 0 {
                                billCycle = 1
                            }
                        }
                }
                
                if !isOnDemand {
                    Section("Billing Schedule") {
                        Stepper("Bill Day: \(billDay)", value: $billDay, in: 1...31)
                        
                        Picker("Bill Cycle", selection: $billCycle) {
                            Text("Monthly").tag(1)
                            Text("Quarterly").tag(3)
                            Text("Half-Yearly").tag(6)
                            Text("Yearly").tag(12)
                        }
                    }
                }
                
                Section("Amount") {
                    HStack {
                        Text("$")
                        TextField("Fixed Amount (Optional)", text: $fixedAmount)
                            .keyboardType(.decimalPad)
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
            .navigationTitle(isEditing ? "Edit Bill Type" : "New Bill Type")
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
                            saveBillType()
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
                if let billType = billType {
                    name = billType.name
                    icon = billType.icon
                    color = billType.color
                    billDay = billType.billDay
                    billCycle = billType.billCycle
                    isOnDemand = billType.billCycle == 0
                    fixedAmount = billType.fixedAmount ?? ""
                }
            }
        }
    }
    
    private func saveBillType() {
        isLoading = true
        errorMessage = nil
        
        let request = CreateBillTypeRequest(
            name: name,
            icon: icon,
            color: color,
            billDay: billDay,
            billCycle: isOnDemand ? 0 : billCycle,
            fixedAmount: fixedAmount.isEmpty ? nil : fixedAmount,
            expenseTypeId: nil
        )
        
        let publisher: AnyPublisher<BillType, APIError>
        if let billType = billType {
            publisher = BillTypeService.shared.updateBillType(id: billType.id, request: request)
        } else {
            publisher = BillTypeService.shared.createBillType(request: request)
        }
        
        publisher
            .receive(on: DispatchQueue.main)
            .sink { [self] completion in
                isLoading = false
                if case .failure(let error) = completion {
                    handleError(error)
                }
            } receiveValue: { [self] savedBillType in
                onSave(savedBillType)
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

struct BillTypeFormView_Previews: PreviewProvider {
    static var previews: some View {
        BillTypeFormView(billType: nil) { _ in }
    }
}
