//
//  ExpenseItemViewModel.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation
import Combine

class ExpenseItemViewModel: ObservableObject {
    @Published var expenseItems: [ExpenseItem] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    
    private var cancellables = Set<AnyCancellable>()
    
    func loadExpenseItems(year: Int? = nil, month: Int? = nil, expenseTypeId: Int? = nil) {
        isLoading = true
        errorMessage = nil
        
        ExpenseItemService.shared.getExpenseItems(year: year, month: month, expenseTypeId: expenseTypeId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] response in
                self?.expenseItems = response.expenseItems
            }
            .store(in: &cancellables)
    }
    
    func deleteExpenseItem(_ item: ExpenseItem) {
        ExpenseItemService.shared.deleteExpenseItem(id: item.id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] _ in
                self?.expenseItems.removeAll { $0.id == item.id }
                self?.successMessage = "Expense deleted"
            }
            .store(in: &cancellables)
    }
    
    func refresh(year: Int? = nil, month: Int? = nil, expenseTypeId: Int? = nil) {
        loadExpenseItems(year: year, month: month, expenseTypeId: expenseTypeId)
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
