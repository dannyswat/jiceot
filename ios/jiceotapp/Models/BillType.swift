//
//  BillType.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation

struct BillType: Codable, Identifiable {
    let id: Int
    let name: String
    let icon: String
    let color: String
    let billDay: Int
    let billCycle: Int
    let fixedAmount: String?
    let stopped: Bool
    let expenseTypeId: Int?
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
        case stopped
        case expenseTypeId = "expense_type_id"
        case userId = "user_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct CreateBillTypeRequest: Codable {
    let name: String
    let icon: String?
    let color: String?
    let billDay: Int?
    let billCycle: Int?
    let fixedAmount: String?
    let expenseTypeId: Int?
    
    enum CodingKeys: String, CodingKey {
        case name
        case icon
        case color
        case billDay = "bill_day"
        case billCycle = "bill_cycle"
        case fixedAmount = "fixed_amount"
        case expenseTypeId = "expense_type_id"
    }
}

struct BillTypeListResponse: Codable {
    let billTypes: [BillType]
    let total: Int
    
    enum CodingKeys: String, CodingKey {
        case billTypes = "bill_types"
        case total
    }
}
