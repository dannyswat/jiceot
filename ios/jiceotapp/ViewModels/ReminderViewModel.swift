//
//  ReminderViewModel.swift
//  JiceotApp
//
//  Created for Reminders feature.
//

import Foundation
import Combine

class ReminderViewModel: ObservableObject {
    @Published var reminders: [Reminder] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        loadReminders()
    }
    
    func loadReminders(showAll: Bool = false) {
        isLoading = true
        errorMessage = nil
        
        ReminderService.shared.getReminders(showAll: showAll)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] response in
                self?.reminders = response.reminders
            }
            .store(in: &cancellables)
    }
    
    func toggleReminder(_ reminder: Reminder) {
        ReminderService.shared.toggleReminder(id: reminder.id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] updatedReminder in
                if let index = self?.reminders.firstIndex(where: { $0.id == updatedReminder.id }) {
                    self?.reminders[index] = updatedReminder
                }
                self?.successMessage = updatedReminder.isActive ? "Reminder activated" : "Reminder deactivated"
            }
            .store(in: &cancellables)
    }
    
    func deleteReminder(_ reminder: Reminder) {
        ReminderService.shared.deleteReminder(id: reminder.id)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] _ in
                self?.reminders.removeAll { $0.id == reminder.id }
                self?.successMessage = "Reminder deleted"
            }
            .store(in: &cancellables)
    }
    
    func refresh() {
        loadReminders()
    }
    
    private func handleError(_ error: APIError) {
        switch error {
        case .serverError(let message):
            errorMessage = message
        case .networkError:
            errorMessage = "Network error. Please try again."
        default:
            errorMessage = "An error occurred. Please try again."
        }
    }
}
