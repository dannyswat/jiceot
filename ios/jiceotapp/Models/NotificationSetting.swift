//
//  NotificationSetting.swift
//  JiceotApp
//
//  Created for Notification Settings feature.
//

import Foundation

struct NotificationSetting: Codable {
    let id: Int
    let userId: Int
    let barkApiUrl: String
    let barkEnabled: Bool
    let timezone: String
    let remindHour: Int
    let remindDaysBefore: Int
    let createdAt: String
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case barkApiUrl = "bark_api_url"
        case barkEnabled = "bark_enabled"
        case timezone
        case remindHour = "remind_hour"
        case remindDaysBefore = "remind_days_before"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct CreateOrUpdateNotificationSettingRequest: Codable {
    let barkApiUrl: String
    let barkEnabled: Bool
    let timezone: String
    let remindHour: Int
    let remindDaysBefore: Int
    
    enum CodingKeys: String, CodingKey {
        case barkApiUrl = "bark_api_url"
        case barkEnabled = "bark_enabled"
        case timezone
        case remindHour = "remind_hour"
        case remindDaysBefore = "remind_days_before"
    }
}
