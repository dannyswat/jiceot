//
//  ExpenseType.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation

struct ExpenseType: Codable, Identifiable {
    let id: Int
    let name: String
    let icon: String
    let color: String
    let userId: Int
    let createdAt: String
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case icon
        case color
        case userId = "user_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct CreateExpenseTypeRequest: Codable {
    let name: String
    let icon: String?
    let color: String?
}

struct ExpenseTypeListResponse: Codable {
    let expenseTypes: [ExpenseType]
    let total: Int
    
    enum CodingKeys: String, CodingKey {
        case expenseTypes = "expense_types"
        case total
    }
}
