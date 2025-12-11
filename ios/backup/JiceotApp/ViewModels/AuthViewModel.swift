//
//  AuthViewModel.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation
import Combine

class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        checkAuthentication()
    }
    
    func checkAuthentication() {
        guard AuthService.shared.getToken() != nil else {
            isAuthenticated = false
            return
        }
        
        AuthService.shared.getCurrentUser()
            .sink { [weak self] completion in
                if case .failure = completion {
                    self?.isAuthenticated = false
                    AuthService.shared.clearToken()
                }
            } receiveValue: { [weak self] user in
                self?.currentUser = user
                self?.isAuthenticated = true
            }
            .store(in: &cancellables)
    }
    
    func login(email: String, password: String) {
        isLoading = true
        errorMessage = nil
        
        AuthService.shared.login(email: email, password: password)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] response in
                AuthService.shared.saveToken(response.token)
                self?.currentUser = response.user
                self?.isAuthenticated = true
            }
            .store(in: &cancellables)
    }
    
    func register(email: String, password: String, name: String) {
        isLoading = true
        errorMessage = nil
        
        AuthService.shared.register(email: email, password: password, name: name)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] response in
                AuthService.shared.saveToken(response.token)
                self?.currentUser = response.user
                self?.isAuthenticated = true
            }
            .store(in: &cancellables)
    }
    
    func logout() {
        AuthService.shared.logout()
            .receive(on: DispatchQueue.main)
            .sink { _ in } receiveValue: { [weak self] _ in
                self?.performLogout()
            }
            .store(in: &cancellables)
        
        // Logout locally even if server request fails
        performLogout()
    }
    
    private func performLogout() {
        AuthService.shared.clearToken()
        currentUser = nil
        isAuthenticated = false
    }
    
    private func handleError(_ error: APIError) {
        switch error {
        case .unauthorized:
            errorMessage = "Invalid credentials"
        case .serverError(let message):
            errorMessage = message
        case .networkError:
            errorMessage = "Network error. Please try again."
        default:
            errorMessage = "An error occurred. Please try again."
        }
    }
}
