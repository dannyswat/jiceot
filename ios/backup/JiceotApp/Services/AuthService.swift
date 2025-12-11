//
//  AuthService.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation
import Combine

class AuthService {
    static let shared = AuthService()
    
    private init() {}
    
    func login(email: String, password: String) -> AnyPublisher<AuthResponse, APIError> {
        let request = LoginRequest(email: email, password: password)
        guard let body = APIService.shared.encodeBody(request) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.login,
            method: "POST",
            body: body,
            requiresAuth: false
        )
    }
    
    func register(email: String, password: String, name: String) -> AnyPublisher<AuthResponse, APIError> {
        let request = RegisterRequest(email: email, password: password, name: name)
        guard let body = APIService.shared.encodeBody(request) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.register,
            method: "POST",
            body: body,
            requiresAuth: false
        )
    }
    
    func getCurrentUser() -> AnyPublisher<User, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.me,
            method: "GET"
        )
    }
    
    func logout() -> AnyPublisher<MessageResponse, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.logout,
            method: "POST"
        )
    }
    
    func changePassword(currentPassword: String, newPassword: String) -> AnyPublisher<MessageResponse, APIError> {
        let request = ChangePasswordRequest(currentPassword: currentPassword, newPassword: newPassword)
        guard let body = APIService.shared.encodeBody(request) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.changePassword,
            method: "PUT",
            body: body
        )
    }
    
    func saveToken(_ token: String) {
        _ = KeychainService.shared.save(token, for: Constants.Keychain.tokenKey)
    }
    
    func getToken() -> String? {
        return KeychainService.shared.get(Constants.Keychain.tokenKey)
    }
    
    func clearToken() {
        _ = KeychainService.shared.delete(Constants.Keychain.tokenKey)
    }
}
