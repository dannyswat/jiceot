//
//  BillTypeViewModel.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation
import Combine

class BillTypeViewModel: ObservableObject {
    @Published var billTypes: [BillType] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        loadBillTypes()
    }
    
    func loadBillTypes(includeStopped: Bool = false) {
        isLoading = true
        errorMessage = nil
        
        BillTypeService.shared.getBillTypes(includeStopped: includeStopped)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] response in
                self?.billTypes = response.billTypes
            }
            .store(in: &cancellables)
    }
    
    func toggleBillType(_ billType: BillType) {
        BillTypeService.shared.toggleBillType(id: billType.id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] updatedBillType in
                if let index = self?.billTypes.firstIndex(where: { $0.id == updatedBillType.id }) {
                    self?.billTypes[index] = updatedBillType
                }
                self?.successMessage = updatedBillType.stopped ? "Bill type disabled" : "Bill type enabled"
            }
            .store(in: &cancellables)
    }
    
    func deleteBillType(_ billType: BillType) {
        BillTypeService.shared.deleteBillType(id: billType.id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] _ in
                self?.billTypes.removeAll { $0.id == billType.id }
                self?.successMessage = "Bill type deleted"
            }
            .store(in: &cancellables)
    }
    
    func refresh() {
        loadBillTypes()
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
