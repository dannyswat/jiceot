//
//  DashboardViewModel.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation
import Combine

class DashboardViewModel: ObservableObject {
    @Published var stats: DashboardStats?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        loadDashboardStats()
    }
    
    func loadDashboardStats() {
        isLoading = true
        errorMessage = nil
        
        DashboardService.shared.getDashboardStats()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] stats in
                self?.stats = stats
            }
            .store(in: &cancellables)
    }
    
    func refresh() {
        loadDashboardStats()
    }
    
    private func handleError(_ error: APIError) {
        switch error {
        case .serverError(let message):
            errorMessage = message
        case .networkError:
            errorMessage = "Network error. Please try again."
        default:
            errorMessage = "Failed to load dashboard. Please try again."
        }
    }
}
