//
//  ReportsViewModel.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation
import Combine

class ReportsViewModel: ObservableObject {
    @Published var monthlyReport: MonthlyReport?
    @Published var yearlyReport: YearlyReport?
    @Published var isLoadingMonthly = false
    @Published var isLoadingYearly = false
    @Published var errorMessage: String?
    
    private var cancellables = Set<AnyCancellable>()
    
    func loadMonthlyReport(year: Int, month: Int) {
        isLoadingMonthly = true
        errorMessage = nil
        
        ReportsService.shared.getMonthlyReport(year: year, month: month)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoadingMonthly = false
                if case .failure(let error) = completion {
                    switch error {
                    case .unauthorized:
                        self?.errorMessage = "Unauthorized. Please log in again."
                    case .networkError(let err):
                        self?.errorMessage = err.localizedDescription
                    case .decodingError:
                        self?.errorMessage = "Failed to decode report data"
                    case .invalidURL:
                        self?.errorMessage = "Invalid URL"
                    case .serverError(let message):
                        self?.errorMessage = message
                    @unknown default:
                        self?.errorMessage = "An unknown error occurred"
                    }
                }
            } receiveValue: { [weak self] report in
                self?.monthlyReport = report
            }
            .store(in: &cancellables)
    }
    
    func loadYearlyReport(year: Int) {
        isLoadingYearly = true
        errorMessage = nil
        
        ReportsService.shared.getYearlyReport(year: year)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoadingYearly = false
                if case .failure(let error) = completion {
                    switch error {
                    case .unauthorized:
                        self?.errorMessage = "Unauthorized. Please log in again."
                    case .networkError(let err):
                        self?.errorMessage = err.localizedDescription
                    case .decodingError:
                        self?.errorMessage = "Failed to decode report data"
                    case .invalidURL:
                        self?.errorMessage = "Invalid URL"
                    case .serverError(let message):
                        self?.errorMessage = message
                    @unknown default:
                        self?.errorMessage = "An unknown error occurred"
                    }
                }
            } receiveValue: { [weak self] report in
                self?.yearlyReport = report
            }
            .store(in: &cancellables)
    }
    
    func refresh(year: Int, month: Int, reportType: ReportType) {
        switch reportType {
        case .monthly:
            loadMonthlyReport(year: year, month: month)
        case .yearly:
            loadYearlyReport(year: year)
        }
    }
}

enum ReportType {
    case monthly
    case yearly
}
