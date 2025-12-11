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
    let totalBillPayments: String
    let totalExpenses: String
    let grandTotal: String
    let billPayments: [BillPayment]
    let expenseBreakdown: [ExpenseBreakdown]
    
    enum CodingKeys: String, CodingKey {
        case year
        case month
        case totalBillPayments = "total_bill_payments"
        case totalExpenses = "total_expenses"
        case grandTotal = "grand_total"
        case billPayments = "bill_payments"
        case expenseBreakdown = "expense_breakdown"
    }
}

struct YearlyReport: Codable {
    let year: Int
    let monthlyReports: [MonthlyReport]
    let totalBillPayments: String
    let totalExpenses: String
    let grandTotal: String
    
    enum CodingKeys: String, CodingKey {
        case year
        case monthlyReports = "monthly_reports"
        case totalBillPayments = "total_bill_payments"
        case totalExpenses = "total_expenses"
        case grandTotal = "grand_total"
    }
}

struct ExpenseBreakdown: Codable, Identifiable {
    let id: Int
    let name: String
    let icon: String
    let color: String
    let total: String
    let count: Int
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case icon
        case color
        case total
        case count
    }
}
