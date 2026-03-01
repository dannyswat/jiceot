//
//  ReminderFormView.swift
//  JiceotApp
//
//  Created for Reminders feature.
//

import SwiftUI
import Combine

struct ReminderFormView: View {
    @Environment(\.dismiss) var dismiss
    let reminder: Reminder?
    let onSave: (Reminder) -> Void
    
    @State private var title = ""
    @State private var detail = ""
    @State private var remindDate = Date()
    @State private var remindHour = 9
    @State private var recurrenceType = "none"
    @State private var recurrenceInterval = 1
    @State private var selectedDaysOfWeek: Set<Int> = []
    @State private var dayOfMonth = 1
    @State private var monthOfYear = 1
    @State private var hasEndDate = false
    @State private var endDate = Date()
    @State private var isActive = true
    
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var cancellables = Set<AnyCancellable>()
    @State private var userTimezone = TimeZone.current.identifier
    
    let recurrenceTypes = [
        ("none", "One-time"),
        ("daily", "Daily"),
        ("weekly", "Weekly"),
        ("monthly", "Monthly"),
        ("yearly", "Yearly"),
    ]
    
    let daysOfWeek = [
        (0, "Sun"), (1, "Mon"), (2, "Tue"), (3, "Wed"),
        (4, "Thu"), (5, "Fri"), (6, "Sat"),
    ]
    
    let months = [
        (1, "January"), (2, "February"), (3, "March"), (4, "April"),
        (5, "May"), (6, "June"), (7, "July"), (8, "August"),
        (9, "September"), (10, "October"), (11, "November"), (12, "December"),
    ]

    var isEditing: Bool { reminder != nil }
    var isValid: Bool { !title.isEmpty }
    
    var body: some View {
        NavigationView {
            Form {
                // Basic Information
                Section("Basic Information") {
                    TextField("Title", text: $title)
                    
                    ZStack(alignment: .topLeading) {
                        if detail.isEmpty {
                            Text("Detail (optional)")
                                .foregroundColor(.gray.opacity(0.5))
                                .padding(.top, 8)
                        }
                        TextEditor(text: $detail)
                            .frame(minHeight: 60)
                    }
                }
                
                // Timing
                Section("When to Remind") {
                    DatePicker("Date", selection: $remindDate, displayedComponents: [.date, .hourAndMinute])

                    Text("Times are saved using timezone: \(userTimezone)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Picker("Notification Hour", selection: $remindHour) {
                        ForEach(0..<24, id: \.self) { hour in
                            Text(String(format: "%02d:00", hour)).tag(hour)
                        }
                    }
                }
                
                // Recurrence
                Section("Repeat") {
                    Picker("Frequency", selection: $recurrenceType) {
                        ForEach(recurrenceTypes, id: \.0) { type in
                            Text(type.1).tag(type.0)
                        }
                    }
                    
                    if recurrenceType != "none" {
                        Stepper("Every \(recurrenceInterval) \(intervalLabel)", value: $recurrenceInterval, in: 1...365)
                    }
                }
                
                // Weekly options
                if recurrenceType == "weekly" {
                    Section("Days of Week") {
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 8) {
                            ForEach(daysOfWeek, id: \.0) { day in
                                Button(action: {
                                    if selectedDaysOfWeek.contains(day.0) {
                                        selectedDaysOfWeek.remove(day.0)
                                    } else {
                                        selectedDaysOfWeek.insert(day.0)
                                    }
                                }) {
                                    Text(day.1)
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 8)
                                        .background(
                                            selectedDaysOfWeek.contains(day.0)
                                                ? Color.blue
                                                : Color.gray.opacity(0.2)
                                        )
                                        .foregroundColor(
                                            selectedDaysOfWeek.contains(day.0)
                                                ? .white
                                                : .primary
                                        )
                                        .cornerRadius(8)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                
                // Monthly options
                if recurrenceType == "monthly" {
                    Section("Day of Month") {
                        Picker("Day", selection: $dayOfMonth) {
                            Text("Last day of month").tag(0)
                            ForEach(1...31, id: \.self) { day in
                                Text(ordinal(day)).tag(day)
                            }
                        }
                    }
                }
                
                // Yearly options
                if recurrenceType == "yearly" {
                    Section("Date") {
                        Picker("Month", selection: $monthOfYear) {
                            ForEach(months, id: \.0) { month in
                                Text(month.1).tag(month.0)
                            }
                        }
                        
                        Picker("Day", selection: $dayOfMonth) {
                            Text("Last day of month").tag(0)
                            ForEach(1...31, id: \.self) { day in
                                Text(ordinal(day)).tag(day)
                            }
                        }
                    }
                }
                
                // End date
                if recurrenceType != "none" {
                    Section("End Date") {
                        Toggle("Set End Date", isOn: $hasEndDate)
                        
                        if hasEndDate {
                            DatePicker("End Date", selection: $endDate, displayedComponents: .date)
                        }
                    }
                }
                
                // Status (edit only)
                if isEditing {
                    Section("Status") {
                        Toggle("Active", isOn: $isActive)
                    }
                }
                
                // Error
                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit Reminder" : "New Reminder")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    if isLoading {
                        ProgressView()
                    } else {
                        Button("Save") { saveReminder() }
                            .disabled(!isValid)
                    }
                }
            }
            .onAppear {
                // Load user's saved timezone preference
                NotificationSettingService.shared.getSettings()
                    .receive(on: DispatchQueue.main)
                    .sink { _ in } receiveValue: { settings in
                        if !settings.timezone.isEmpty {
                            userTimezone = settings.timezone
                        }
                    }
                    .store(in: &cancellables)
                
                if let r = reminder {
                    title = r.title
                    detail = r.detail
                    remindHour = r.remindHour
                    recurrenceType = r.recurrenceType
                    recurrenceInterval = r.recurrenceInterval > 0 ? r.recurrenceInterval : 1
                    dayOfMonth = r.recurrenceDayOfMonth
                    monthOfYear = r.recurrenceMonthOfYear > 0 ? r.recurrenceMonthOfYear : 1
                    isActive = r.isActive
                    
                    // Parse days of week
                    if !r.recurrenceDaysOfWeek.isEmpty {
                        selectedDaysOfWeek = Set(
                            r.recurrenceDaysOfWeek.split(separator: ",")
                                .compactMap { Int($0.trimmingCharacters(in: .whitespaces)) }
                        )
                    }
                    
                    // Parse remind at date
                    let formatter = ISO8601DateFormatter()
                    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                    if let date = formatter.date(from: r.remindAt) ?? ISO8601DateFormatter().date(from: r.remindAt) {
                        remindDate = date
                    }
                    
                    // Parse end date
                    if let endDateStr = r.recurrenceEndDate {
                        let df = ISO8601DateFormatter()
                        df.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                        if let date = df.date(from: endDateStr) ?? ISO8601DateFormatter().date(from: endDateStr) {
                            hasEndDate = true
                            endDate = date
                        }
                    }
                    
                    // Use the reminder's own timezone if available
                    if !r.timezone.isEmpty {
                        userTimezone = r.timezone
                    }
                }
            }
        }
    }
    
    private var intervalLabel: String {
        switch recurrenceType {
        case "daily": return recurrenceInterval == 1 ? "day" : "days"
        case "weekly": return recurrenceInterval == 1 ? "week" : "weeks"
        case "monthly": return recurrenceInterval == 1 ? "month" : "months"
        case "yearly": return recurrenceInterval == 1 ? "year" : "years"
        default: return ""
        }
    }
    
    private func ordinal(_ n: Int) -> String {
        let suffix: String
        switch n % 10 {
        case 1 where n % 100 != 11: suffix = "st"
        case 2 where n % 100 != 12: suffix = "nd"
        case 3 where n % 100 != 13: suffix = "rd"
        default: suffix = "th"
        }
        return "\(n)\(suffix)"
    }
    
    private func saveReminder() {
        isLoading = true
        errorMessage = nil
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        let remindAtStr = formatter.string(from: remindDate)
        
        let endDateStr: String? = hasEndDate && recurrenceType != "none"
            ? formatter.string(from: endDate)
            : nil
        
        let daysStr = recurrenceType == "weekly"
            ? selectedDaysOfWeek.sorted().map(String.init).joined(separator: ",")
            : nil
        
        let publisher: AnyPublisher<Reminder, APIError>
        
        if let existing = reminder {
            let request = UpdateReminderRequest(
                title: title,
                detail: detail.isEmpty ? nil : detail,
                timezone: userTimezone,
                remindAt: remindAtStr,
                remindHour: remindHour,
                recurrenceType: recurrenceType,
                recurrenceInterval: recurrenceInterval,
                recurrenceDaysOfWeek: daysStr,
                recurrenceDayOfMonth: (recurrenceType == "monthly" || recurrenceType == "yearly") ? dayOfMonth : 0,
                recurrenceMonthOfYear: recurrenceType == "yearly" ? monthOfYear : 0,
                recurrenceEndDate: endDateStr,
                isActive: isActive
            )
            publisher = ReminderService.shared.updateReminder(id: existing.id, request: request)
        } else {
            let request = CreateReminderRequest(
                title: title,
                detail: detail.isEmpty ? nil : detail,
                timezone: userTimezone,
                remindAt: remindAtStr,
                remindHour: remindHour,
                recurrenceType: recurrenceType,
                recurrenceInterval: recurrenceInterval,
                recurrenceDaysOfWeek: daysStr,
                recurrenceDayOfMonth: (recurrenceType == "monthly" || recurrenceType == "yearly") ? dayOfMonth : 0,
                recurrenceMonthOfYear: recurrenceType == "yearly" ? monthOfYear : 0,
                recurrenceEndDate: endDateStr
            )
            publisher = ReminderService.shared.createReminder(request: request)
        }
        
        publisher
            .receive(on: DispatchQueue.main)
            .sink { [self] completion in
                isLoading = false
                if case .failure(let error) = completion {
                    switch error {
                    case .serverError(let message):
                        errorMessage = message
                    case .networkError:
                        errorMessage = "Network error. Please try again."
                    default:
                        errorMessage = "An error occurred. Please try again."
                    }
                }
            } receiveValue: { [self] savedReminder in
                onSave(savedReminder)
                dismiss()
            }
            .store(in: &cancellables)
    }
}

struct ReminderFormView_Previews: PreviewProvider {
    static var previews: some View {
        ReminderFormView(reminder: nil) { _ in }
    }
}
