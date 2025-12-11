//
//  ExpenseTypeService.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation
import Combine

class ExpenseTypeService {
    static let shared = ExpenseTypeService()
    
    private init() {}
    
    func getExpenseTypes() -> AnyPublisher<ExpenseTypeListResponse, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.expenseTypes,
            method: "GET"
        )
    }
    
    func getExpenseType(id: Int) -> AnyPublisher<ExpenseType, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.expenseType(id: id),
            method: "GET"
        )
    }
    
    func createExpenseType(request: CreateExpenseTypeRequest) -> AnyPublisher<ExpenseType, APIError> {
        guard let body = APIService.shared.encodeBody(request) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.expenseTypes,
            method: "POST",
            body: body
        )
    }
    
    func updateExpenseType(id: Int, request: CreateExpenseTypeRequest) -> AnyPublisher<ExpenseType, APIError> {
        guard let body = APIService.shared.encodeBody(request) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.expenseType(id: id),
            method: "PUT",
            body: body
        )
    }
    
    func deleteExpenseType(id: Int) -> AnyPublisher<MessageResponse, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.expenseType(id: id),
            method: "DELETE"
        )
    }
}
