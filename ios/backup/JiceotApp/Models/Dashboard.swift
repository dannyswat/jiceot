//
//  Dashboard.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import Foundation

struct DashboardStats: Codable {
    let totalBills: Int
    let totalExpenses: Int
    let monthlyTotal: String
    let onDemandBills: [BillType]
    let upcomingBills: [UpcomingBill]
    
    enum CodingKeys: String, CodingKey {
        case totalBills = "total_bills"
        case totalExpenses = "total_expenses"
        case monthlyTotal = "monthly_total"
        case onDemandBills = "on_demand_bills"
        case upcomingBills = "upcoming_bills"
    }
}

struct UpcomingBill: Codable, Identifiable {
    let id: Int
    let name: String
    let icon: String
    let color: String
    let nextDueDate: String
    let fixedAmount: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case icon
        case color
        case nextDueDate = "next_due_date"
        case fixedAmount = "fixed_amount"
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
