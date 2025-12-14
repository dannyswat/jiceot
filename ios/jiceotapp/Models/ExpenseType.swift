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
    let billDay: Int
    let billCycle: Int
    let fixedAmount: String
    let userId: Int
    let createdAt: String
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case icon
        case color
        case billDay = "bill_day"
        case billCycle = "bill_cycle"
        case fixedAmount = "fixed_amount"
        case userId = "user_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct CreateExpenseTypeRequest: Codable {
    let name: String
    let icon: String?
    let color: String?
    let billDay: Int?
    let billCycle: Int?
    let fixedAmount: String?
    
    enum CodingKeys: String, CodingKey {
        case name
        case icon
        case color
        case billDay = "bill_day"
        case billCycle = "bill_cycle"
        case fixedAmount = "fixed_amount"
    }
}

struct ExpenseTypeListResponse: Codable {
    let expenseTypes: [ExpenseType]
    let total: Int
    
    enum CodingKeys: String, CodingKey {
        case expenseTypes = "expense_types"
        case total
    }
}
