//
//  Dashboard.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation

struct DashboardStats: Codable {
    let totalExpenses: Double
    let billsPaid: Int
    let pendingBills: Int
    let categories: Int
    let onDemandBills: [BillTypeInfo]
    let upcomingBills: [UpcomingBill]
    
    enum CodingKeys: String, CodingKey {
        case totalExpenses = "total_expenses"
        case billsPaid = "bills_paid"
        case pendingBills = "pending_bills"
        case categories
        case onDemandBills = "on_demand_bills"
        case upcomingBills = "upcoming_bills"
    }
}

struct BillTypeInfo: Codable, Identifiable {
    let id: Int
    let name: String
    let icon: String
    let color: String
    let fixedAmount: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case icon
        case color
        case fixedAmount = "fixed_amount"
    }
}

struct UpcomingBill: Codable, Identifiable {
    let id: Int
    let name: String
    let icon: String
    let color: String
    let nextDueDate: String
    let fixedAmount: String
    let daysUntilDue: Int
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case icon
        case color
        case nextDueDate = "next_due_date"
        case fixedAmount = "fixed_amount"
        case daysUntilDue = "days_until_due"
    }
}

struct DueBill: Codable, Identifiable {
    let id: Int
    let name: String
    let icon: String
    let color: String
    let billDay: Int
    let status: String
    let lastPaymentDate: String?
    let lastPaymentAmount: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case icon
        case color
        case billDay = "bill_day"
        case status
        case lastPaymentDate = "last_payment_date"
        case lastPaymentAmount = "last_payment_amount"
    }
}

struct DueBillsResponse: Codable {
    let dueBills: [DueBill]
    
    enum CodingKeys: String, CodingKey {
        case dueBills = "due_bills"
    }
}
