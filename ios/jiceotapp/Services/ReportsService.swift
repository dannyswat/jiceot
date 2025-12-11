//
//  ReportsService.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation
import Combine

class ReportsService {
    static let shared = ReportsService()
    
    private init() {}
    
    func getMonthlyReport(year: Int, month: Int) -> AnyPublisher<MonthlyReport, APIError> {
        APIService.shared.request(
            endpoint: "/reports/monthly?year=\(year)&month=\(month)",
            method: "GET"
        )
    }
    
    func getYearlyReport(year: Int) -> AnyPublisher<YearlyReport, APIError> {
        APIService.shared.request(
            endpoint: "/reports/yearly?year=\(year)",
            method: "GET"
        )
    }
}
