//
//  ExpenseTypeViewModel.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation
import Combine

class ExpenseTypeViewModel: ObservableObject {
    @Published var expenseTypes: [ExpenseType] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        loadExpenseTypes()
    }
    
    func loadExpenseTypes() {
        isLoading = true
        errorMessage = nil
        
        ExpenseTypeService.shared.getExpenseTypes()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] response in
                self?.expenseTypes = response.expenseTypes
            }
            .store(in: &cancellables)
    }
    
    func deleteExpenseType(_ expenseType: ExpenseType) {
        ExpenseTypeService.shared.deleteExpenseType(id: expenseType.id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] _ in
                self?.expenseTypes.removeAll { $0.id == expenseType.id }
                self?.successMessage = "Expense type deleted"
            }
            .store(in: &cancellables)
    }
    
    func refresh() {
        loadExpenseTypes()
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
