//
//  DashboardService.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation
import Combine

class DashboardService {
    static let shared = DashboardService()
    
    private init() {}
    
    func getDashboardStats() -> AnyPublisher<DashboardStats, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.dashboardStats,
            method: "GET"
        )
    }
    
    func getDueBills(year: Int, month: Int) -> AnyPublisher<DueBillsResponse, APIError> {
        let endpoint = "\(Constants.API.Endpoints.dueBills)?year=\(year)&month=\(month)"
        return APIService.shared.request(
            endpoint: endpoint,
            method: "GET"
        )
    }
}
