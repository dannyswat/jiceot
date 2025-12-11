//
//  BillPaymentViewModel.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation
import Combine

class BillPaymentViewModel: ObservableObject {
    @Published var billPayments: [BillPayment] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    
    private var cancellables = Set<AnyCancellable>()
    
    func loadBillPayments(year: Int? = nil, month: Int? = nil, billTypeId: Int? = nil) {
        isLoading = true
        errorMessage = nil
        
        BillPaymentService.shared.getBillPayments(year: year, month: month, billTypeId: billTypeId)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] response in
                self?.billPayments = response.billPayments
            }
            .store(in: &cancellables)
    }
    
    func deleteBillPayment(_ payment: BillPayment) {
        BillPaymentService.shared.deleteBillPayment(id: payment.id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] _ in
                self?.billPayments.removeAll { $0.id == payment.id }
                self?.successMessage = "Bill payment deleted"
            }
            .store(in: &cancellables)
    }
    
    func refresh(year: Int? = nil, month: Int? = nil, billTypeId: Int? = nil) {
        loadBillPayments(year: year, month: month, billTypeId: billTypeId)
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
