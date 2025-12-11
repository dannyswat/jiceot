//
//  BillTypeService.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation
import Combine

class BillTypeService {
    static let shared = BillTypeService()
    
    private init() {}
    
    func getBillTypes(includeStopped: Bool = false) -> AnyPublisher<BillTypeListResponse, APIError> {
        let endpoint = includeStopped 
            ? "\(Constants.API.Endpoints.billTypes)?include_stopped=true"
            : Constants.API.Endpoints.billTypes
        
        return APIService.shared.request(
            endpoint: endpoint,
            method: "GET"
        )
    }
    
    func getBillType(id: Int) -> AnyPublisher<BillType, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.billType(id: id),
            method: "GET"
        )
    }
    
    func createBillType(request: CreateBillTypeRequest) -> AnyPublisher<BillType, APIError> {
        guard let body = APIService.shared.encodeBody(request) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.billTypes,
            method: "POST",
            body: body
        )
    }
    
    func updateBillType(id: Int, request: CreateBillTypeRequest) -> AnyPublisher<BillType, APIError> {
        guard let body = APIService.shared.encodeBody(request) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.billType(id: id),
            method: "PUT",
            body: body
        )
    }
    
    func deleteBillType(id: Int) -> AnyPublisher<MessageResponse, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.billType(id: id),
            method: "DELETE"
        )
    }
    
    func toggleBillType(id: Int) -> AnyPublisher<BillType, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.toggleBillType(id: id),
            method: "POST"
        )
    }
}
