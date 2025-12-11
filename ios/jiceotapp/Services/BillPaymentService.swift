//
//  BillPaymentService.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation
import Combine

class BillPaymentService {
    static let shared = BillPaymentService()
    
    private init() {}
    
    func getBillPayments(year: Int? = nil, month: Int? = nil, billTypeId: Int? = nil) -> AnyPublisher<BillPaymentListResponse, APIError> {
        var queryItems: [URLQueryItem] = []
        
        if let year = year {
            queryItems.append(URLQueryItem(name: "year", value: String(year)))
        }
        if let month = month {
            queryItems.append(URLQueryItem(name: "month", value: String(month)))
        }
        if let billTypeId = billTypeId {
            queryItems.append(URLQueryItem(name: "bill_type_id", value: String(billTypeId)))
        }
        
        var endpoint = Constants.API.Endpoints.billPayments
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
    
    func getBillPayment(id: Int) -> AnyPublisher<BillPayment, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.billPayment(id: id),
            method: "GET"
        )
    }
    
    func createBillPayment(request: CreateBillPaymentRequest) -> AnyPublisher<BillPayment, APIError> {
        guard let body = APIService.shared.encodeBody(request) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.billPayments,
            method: "POST",
            body: body
        )
    }
    
    func updateBillPayment(id: Int, request: CreateBillPaymentRequest) -> AnyPublisher<BillPayment, APIError> {
        guard let body = APIService.shared.encodeBody(request) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.billPayment(id: id),
            method: "PUT",
            body: body
        )
    }
    
    func deleteBillPayment(id: Int) -> AnyPublisher<MessageResponse, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.billPayment(id: id),
            method: "DELETE"
        )
    }
}
