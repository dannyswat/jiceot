//
//  Reminder.swift
//  JiceotApp
//
//  Created for Reminders feature.
//

import Foundation

struct Reminder: Codable, Identifiable {
    let id: Int
    let title: String
    let detail: String
    let timezone: String
    let remindAt: String
    let remindHour: Int
    let recurrenceType: String
    let recurrenceInterval: Int
    let recurrenceDaysOfWeek: String
    let recurrenceDayOfMonth: Int
    let recurrenceMonthOfYear: Int
    let recurrenceEndDate: String?
    let nextRemindAt: String
    let lastRemindedAt: String?
    let isActive: Bool
    let completedAt: String?
    let userId: Int
    let createdAt: String
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case detail
        case timezone
        case remindAt = "remind_at"
        case remindHour = "remind_hour"
        case recurrenceType = "recurrence_type"
        case recurrenceInterval = "recurrence_interval"
        case recurrenceDaysOfWeek = "recurrence_days_of_week"
        case recurrenceDayOfMonth = "recurrence_day_of_month"
        case recurrenceMonthOfYear = "recurrence_month_of_year"
        case recurrenceEndDate = "recurrence_end_date"
        case nextRemindAt = "next_remind_at"
        case lastRemindedAt = "last_reminded_at"
        case isActive = "is_active"
        case completedAt = "completed_at"
        case userId = "user_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    var recurrenceDescription: String {
        let interval = recurrenceInterval > 0 ? recurrenceInterval : 1
        switch recurrenceType {
        case "none":
            return "One-time"
        case "daily":
            return interval == 1 ? "Daily" : "Every \(interval) days"
        case "weekly":
            let dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
            let days = recurrenceDaysOfWeek.split(separator: ",")
                .compactMap { Int($0.trimmingCharacters(in: .whitespaces)) }
                .compactMap { $0 >= 0 && $0 <= 6 ? dayNames[$0] : nil }
                .joined(separator: ", ")
            let prefix = interval == 1 ? "Weekly" : "Every \(interval) weeks"
            return days.isEmpty ? prefix : "\(prefix) on \(days)"
        case "monthly":
            let day = recurrenceDayOfMonth == 0 ? "last day" : "day \(recurrenceDayOfMonth)"
            return interval == 1 ? "Monthly on \(day)" : "Every \(interval) months on \(day)"
        case "yearly":
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM"
            let monthName = recurrenceMonthOfYear >= 1 && recurrenceMonthOfYear <= 12
                ? formatter.monthSymbols[recurrenceMonthOfYear - 1]
                : ""
            let day = recurrenceDayOfMonth == 0 ? "last day" : "\(recurrenceDayOfMonth)"
            return interval == 1
                ? "Yearly on \(monthName) \(day)"
                : "Every \(interval) years on \(monthName) \(day)"
        default:
            return "Unknown"
        }
    }
}

struct CreateReminderRequest: Codable {
    let title: String
    let detail: String?
    let timezone: String
    let remindAt: String
    let remindHour: Int
    let recurrenceType: String
    let recurrenceInterval: Int?
    let recurrenceDaysOfWeek: String?
    let recurrenceDayOfMonth: Int?
    let recurrenceMonthOfYear: Int?
    let recurrenceEndDate: String?
    
    enum CodingKeys: String, CodingKey {
        case title
        case detail
        case timezone
        case remindAt = "remind_at"
        case remindHour = "remind_hour"
        case recurrenceType = "recurrence_type"
        case recurrenceInterval = "recurrence_interval"
        case recurrenceDaysOfWeek = "recurrence_days_of_week"
        case recurrenceDayOfMonth = "recurrence_day_of_month"
        case recurrenceMonthOfYear = "recurrence_month_of_year"
        case recurrenceEndDate = "recurrence_end_date"
    }
}

struct UpdateReminderRequest: Codable {
    let title: String
    let detail: String?
    let timezone: String
    let remindAt: String
    let remindHour: Int
    let recurrenceType: String
    let recurrenceInterval: Int?
    let recurrenceDaysOfWeek: String?
    let recurrenceDayOfMonth: Int?
    let recurrenceMonthOfYear: Int?
    let recurrenceEndDate: String?
    let isActive: Bool
    
    enum CodingKeys: String, CodingKey {
        case title
        case detail
        case timezone
        case remindAt = "remind_at"
        case remindHour = "remind_hour"
        case recurrenceType = "recurrence_type"
        case recurrenceInterval = "recurrence_interval"
        case recurrenceDaysOfWeek = "recurrence_days_of_week"
        case recurrenceDayOfMonth = "recurrence_day_of_month"
        case recurrenceMonthOfYear = "recurrence_month_of_year"
        case recurrenceEndDate = "recurrence_end_date"
        case isActive = "is_active"
    }
}

struct ReminderListResponse: Codable {
    let reminders: [Reminder]
    let total: Int
}
