//
//  ExpenseItem.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation

struct ExpenseItem: Codable, Identifiable {
    let id: Int
    let billPaymentId: Int?
    let billTypeId: Int?
    let expenseTypeId: Int
    let year: Int
    let month: Int
    let amount: String
    let note: String
    let userId: Int
    let createdAt: String
    let updatedAt: String
    let expenseType: ExpenseType?
    let billPayment: BillPayment?
    let billType: BillType?
    
    enum CodingKeys: String, CodingKey {
        case id
        case billPaymentId = "bill_payment_id"
        case billTypeId = "bill_type_id"
        case expenseTypeId = "expense_type_id"
        case year
        case month
        case amount
        case note
        case userId = "user_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case expenseType = "expense_type"
        case billPayment = "bill_payment"
        case billType = "bill_type"
    }
}

struct CreateExpenseItemRequest: Codable {
    let billPaymentId: Int?
    let billTypeId: Int?
    let expenseTypeId: Int
    let year: Int
    let month: Int
    let amount: String
    let note: String?
    
    enum CodingKeys: String, CodingKey {
        case billPaymentId = "bill_payment_id"
        case billTypeId = "bill_type_id"
        case expenseTypeId = "expense_type_id"
        case year
        case month
        case amount
        case note
    }
}

struct ExpenseItemListResponse: Codable {
    let expenseItems: [ExpenseItem]
    let total: Int
    
    enum CodingKeys: String, CodingKey {
        case expenseItems = "expense_items"
        case total
    }
}
