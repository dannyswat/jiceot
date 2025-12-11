//
//  ExpenseItemService.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation
import Combine

class ExpenseItemService {
    static let shared = ExpenseItemService()
    
    private init() {}
    
    func getExpenseItems(year: Int? = nil, month: Int? = nil, expenseTypeId: Int? = nil) -> AnyPublisher<ExpenseItemListResponse, APIError> {
        var queryItems: [URLQueryItem] = []
        
        if let year = year {
            queryItems.append(URLQueryItem(name: "year", value: String(year)))
        }
        if let month = month {
            queryItems.append(URLQueryItem(name: "month", value: String(month)))
        }
        if let expenseTypeId = expenseTypeId {
            queryItems.append(URLQueryItem(name: "expense_type_id", value: String(expenseTypeId)))
        }
        
        var endpoint = Constants.API.Endpoints.expenseItems
        if !queryItems.isEmpty {
            var components = URLComponents(string: endpoint)
            components?.queryItems = queryItems
            endpoint = components?.string ?? endpoint
        }
        
        return APIService.shared.request(
            endpoint: endpoint,
            method: "GET"
        )
    }
    
    func getExpenseItem(id: Int) -> AnyPublisher<ExpenseItem, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.expenseItem(id: id),
            method: "GET"
        )
    }
    
    func createExpenseItem(request: CreateExpenseItemRequest) -> AnyPublisher<ExpenseItem, APIError> {
        guard let body = APIService.shared.encodeBody(request) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.expenseItems,
            method: "POST",
            body: body
        )
    }
    
    func updateExpenseItem(id: Int, request: CreateExpenseItemRequest) -> AnyPublisher<ExpenseItem, APIError> {
        guard let body = APIService.shared.encodeBody(request) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.expenseItem(id: id),
            method: "PUT",
            body: body
        )
    }
    
    func deleteExpenseItem(id: Int) -> AnyPublisher<MessageResponse, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.expenseItem(id: id),
            method: "DELETE"
        )
    }
}
