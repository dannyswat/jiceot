//
//  ReminderService.swift
//  JiceotApp
//
//  Created for Reminders feature.
//

import Foundation
import Combine

class ReminderService {
    static let shared = ReminderService()
    
    private init() {}
    
    func getReminders(showAll: Bool = false) -> AnyPublisher<ReminderListResponse, APIError> {
        let endpoint = showAll
            ? "\(Constants.API.Endpoints.reminders)?show_all=true"
            : Constants.API.Endpoints.reminders
        
        return APIService.shared.request(
            endpoint: endpoint,
            method: "GET"
        )
    }
    
    func getReminder(id: Int) -> AnyPublisher<Reminder, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.reminder(id: id),
            method: "GET"
        )
    }
    
    func createReminder(request: CreateReminderRequest) -> AnyPublisher<Reminder, APIError> {
        guard let body = APIService.shared.encodeBody(request) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.reminders,
            method: "POST",
            body: body
        )
    }
    
    func updateReminder(id: Int, request: UpdateReminderRequest) -> AnyPublisher<Reminder, APIError> {
        guard let body = APIService.shared.encodeBody(request) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.reminder(id: id),
            method: "PUT",
            body: body
        )
    }
    
    func deleteReminder(id: Int) -> AnyPublisher<MessageResponse, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.reminder(id: id),
            method: "DELETE"
        )
    }
    
    func toggleReminder(id: Int) -> AnyPublisher<Reminder, APIError> {
        return APIService.shared.request(
            endpoint: Constants.API.Endpoints.toggleReminder(id: id),
            method: "POST"
        )
    }
}
