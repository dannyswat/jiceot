//
//  BillPayment.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation

struct BillPayment: Codable, Identifiable {
    let id: Int
    let billTypeId: Int
    let year: Int
    let month: Int
    let amount: String
    let note: String
    let userId: Int
    let createdAt: String
    let updatedAt: String
    let billType: BillType?
    
    enum CodingKeys: String, CodingKey {
        case id
        case billTypeId = "bill_type_id"
        case year
        case month
        case amount
        case note
        case userId = "user_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case billType = "bill_type"
    }
}

struct CreateBillPaymentRequest: Codable {
    let billTypeId: Int
    let year: Int
    let month: Int
    let amount: String
    let note: String?
    
    enum CodingKeys: String, CodingKey {
        case billTypeId = "bill_type_id"
        case year
        case month
        case amount
        case note
    }
}

struct BillPaymentListResponse: Codable {
    let billPayments: [BillPayment]
    let total: Int
    
    enum CodingKeys: String, CodingKey {
        case billPayments = "bill_payments"
        case total
    }
}
