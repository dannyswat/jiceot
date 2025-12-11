//
//  Reports.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation

struct MonthlyReport: Codable {
    let year: Int
    let month: Int
    let totalAmount: Double
    let expenseAmount: Double
    let billAmount: Double
    let unexplainedPayment: Double
    let expenseTypeBreakdown: [String: TypeBreakdownItem]
    let billTypeBreakdown: [String: TypeBreakdownItem]
    
    enum CodingKeys: String, CodingKey {
        case year
        case month
        case totalAmount = "total_amount"
        case expenseAmount = "expense_amount"
        case billAmount = "bill_amount"
        case unexplainedPayment = "unexplained_payment"
        case expenseTypeBreakdown = "expense_type_breakdown"
        case billTypeBreakdown = "bill_type_breakdown"
    }
}

struct YearlyReport: Codable {
    let year: Int
    let months: [MonthlyReport]
    let summary: YearlySummary
    
    enum CodingKeys: String, CodingKey {
        case year
        case months
        case summary
    }
}

struct YearlySummary: Codable {
    let totalAmount: Double
    let totalExpenseAmount: Double
    let totalBillAmount: Double
    let averageMonthly: Double
    
    enum CodingKeys: String, CodingKey {
        case totalAmount = "total_amount"
        case totalExpenseAmount = "total_expense_amount"
        case totalBillAmount = "total_bill_amount"
        case averageMonthly = "average_monthly"
    }
}

struct TypeBreakdownItem: Codable {
    let amount: Double
    let count: Int
    let color: String
    let icon: String
}
