//
//  Constants.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation

struct Constants {
    // MARK: - API Configuration
    struct API {
        #if DEBUG
        static let baseURL = "http://localhost:8080"
        #else
        static let baseURL = "https://api.jiceot.com"
        #endif
        
        static let apiPath = "/api"
        
        // Endpoints
        struct Endpoints {
            // Auth
            static let login = "/auth/login"
            static let register = "/auth/register"
            static let me = "/auth/me"
            static let logout = "/auth/logout"
            static let changePassword = "/auth/password"
            
            // Dashboard
            static let dashboardStats = "/dashboard/stats"
            static let dueBills = "/dashboard/due-bills"
            
            // Bill Types
            static let billTypes = "/bill-types"
            static func billType(id: Int) -> String { "/bill-types/\(id)" }
            static func toggleBillType(id: Int) -> String { "/bill-types/\(id)/toggle" }
            
            // Bill Payments
            static let billPayments = "/bill-payments"
            static func billPayment(id: Int) -> String { "/bill-payments/\(id)" }
            
            // Expense Types
            static let expenseTypes = "/expense-types"
            static func expenseType(id: Int) -> String { "/expense-types/\(id)" }
            
            // Expense Items
            static let expenseItems = "/expense-items"
            static func expenseItem(id: Int) -> String { "/expense-items/\(id)" }
            
            // Reports
            static let monthlyReport = "/reports/monthly"
            static let yearlyReport = "/reports/yearly"
            
            // Notifications
            static let notificationSettings = "/notifications/settings"
        }
    }
    
    // MARK: - Keychain
    struct Keychain {
        static let serviceName = "com.jiceot.app"
        static let tokenKey = "authToken"
    }
    
    // MARK: - UserDefaults
    struct UserDefaultsKeys {
        static let userId = "userId"
        static let userEmail = "userEmail"
        static let userName = "userName"
    }
    
    // MARK: - App Info
    struct App {
        static let name = "Jiceot"
        static let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        static let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }
    
    // MARK: - Colors (Hex)
    struct Colors {
        static let primaryYellow = "007AFF"  // Changed to blue
        static let secondaryIndigo = "6366F1"
        static let successGreen = "10B981"
        static let warningAmber = "F59E0B"
        static let dangerRed = "EF4444"
    }
}
