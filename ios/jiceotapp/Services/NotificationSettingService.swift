//
//  NotificationSettingService.swift
//  JiceotApp
//
//  Created for Notification Settings feature.
//

import Foundation
import Combine

class NotificationSettingService {
    static let shared = NotificationSettingService()
    
    private init() {}
    
    func getSettings() -> AnyPublisher<NotificationSetting, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.notificationSettings,
            method: "GET"
        )
    }
    
    func createOrUpdate(request: CreateOrUpdateNotificationSettingRequest) -> AnyPublisher<NotificationSetting, APIError> {
        guard let body = APIService.shared.encodeBody(request) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.notificationSettings,
            method: "PUT",
            body: body
        )
    }
}
