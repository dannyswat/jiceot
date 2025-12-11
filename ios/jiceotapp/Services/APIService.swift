//
//  APIService.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation
import Combine

enum APIError: Error {
    case invalidURL
    case invalidResponse
    case unauthorized
    case serverError(String)
    case decodingError
    case networkError(Error)
}

class APIService {
    static let shared = APIService()
    
    private let baseURL = Constants.API.baseURL + Constants.API.apiPath
    private var cancellables = Set<AnyCancellable>()
    
    private init() {}
    
    // MARK: - Generic Request Method
    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil,
        requiresAuth: Bool = true
    ) -> AnyPublisher<T, APIError> {
        guard let url = URL(string: baseURL + endpoint) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if requiresAuth, let token = KeychainService.shared.get(Constants.Keychain.tokenKey) {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = body
        }
        
        return URLSession.shared.dataTaskPublisher(for: request)
            .tryMap { data, response -> Data in
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw APIError.invalidResponse
                }
                
                if httpResponse.statusCode == 401 {
                    throw APIError.unauthorized
                }
                
                if httpResponse.statusCode >= 400 {
                    if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                        throw APIError.serverError(errorResponse.error)
                    }
                    throw APIError.serverError("Server error: \(httpResponse.statusCode)")
                }
                
                return data
            }
            .decode(type: T.self, decoder: JSONDecoder())
            .mapError { error in
                if let apiError = error as? APIError {
                    return apiError
                } else if error is DecodingError {
                    return APIError.decodingError
                } else {
                    return APIError.networkError(error)
                }
            }
            .eraseToAnyPublisher()
    }
    
    // MARK: - Helper Methods
    func encodeBody<T: Encodable>(_ body: T) -> Data? {
        return try? JSONEncoder().encode(body)
    }
}

struct ErrorResponse: Codable {
    let error: String
}

struct MessageResponse: Codable {
    let message: String
}
