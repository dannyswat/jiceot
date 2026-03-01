//
//  NotificationSettingsView.swift
//  JiceotApp
//
//  Created for Notification Settings feature.
//

import SwiftUI
import Combine

struct NotificationSettingsView: View {
    @State private var barkApiUrl = ""
    @State private var barkEnabled = false
    @State private var timezone = TimeZone.current.identifier
    @State private var remindHour = 9
    @State private var remindDaysBefore = 3
    
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var successMessage: String?
    @State private var timezoneSearch = ""
    @State private var cancellables = Set<AnyCancellable>()
    
    private var allTimezones: [String] {
        TimeZone.knownTimeZoneIdentifiers.sorted()
    }
    
    private var filteredTimezones: [String] {
        if timezoneSearch.isEmpty {
            return allTimezones
        }
        let lower = timezoneSearch.lowercased()
        return allTimezones.filter { $0.lowercased().contains(lower) }
    }
    
    private func offsetString(for identifier: String) -> String {
        guard let tz = TimeZone(identifier: identifier) else { return "" }
        let seconds = tz.secondsFromGMT()
        let hours = seconds / 3600
        let minutes = abs(seconds % 3600) / 60
        if minutes == 0 {
            return String(format: "GMT%+d", hours)
        }
        return String(format: "GMT%+d:%02d", hours, minutes)
    }
    
    let dayOptions: [(Int, String)] = [
        (0, "Same day"),
        (1, "1 day before"),
        (2, "2 days before"),
        (3, "3 days before"),
        (5, "5 days before"),
        (7, "1 week before"),
        (14, "2 weeks before"),
        (30, "1 month before"),
    ]
    
    var body: some View {
        Form {
            if isLoading {
                Section {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                }
            } else {
                // Bark Configuration
                Section("Bark Notifications") {
                    Toggle("Enable Notifications", isOn: $barkEnabled)
                    
                    TextField("Bark API URL", text: $barkApiUrl)
                        .keyboardType(.URL)
                        .autocapitalization(.none)
                        .disabled(!barkEnabled)
                    
                    Text("Get this from your Bark app. Format: https://api.day.app/YOUR_KEY")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                // Timezone
                Section("Timezone") {
                    HStack {
                        Text("Current")
                        Spacer()
                        Text("\(timezone) (\(offsetString(for: timezone)))")
                            .foregroundColor(.secondary)
                    }
                    
                    TextField("Search timezone...", text: $timezoneSearch)
                        .autocapitalization(.none)
                    
                    if !timezoneSearch.isEmpty {
                        ForEach(filteredTimezones.prefix(10), id: \.self) { tz in
                            Button(action: {
                                timezone = tz
                                timezoneSearch = ""
                            }) {
                                HStack {
                                    Text(tz)
                                        .foregroundColor(.primary)
                                    Spacer()
                                    Text(offsetString(for: tz))
                                        .foregroundColor(.secondary)
                                        .font(.caption)
                                    if tz == timezone {
                                        Image(systemName: "checkmark")
                                            .foregroundColor(.blue)
                                    }
                                }
                            }
                        }
                    }
                    
                    Text("All times (reminder hour, notifications) use this timezone.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                // Reminder Timing
                Section("Reminder Timing") {
                    Picker("Reminder Hour", selection: $remindHour) {
                        ForEach(0..<24, id: \.self) { hour in
                            Text(String(format: "%02d:00", hour)).tag(hour)
                        }
                    }
                    .disabled(!barkEnabled)
                    
                    Picker("Remind Before Due", selection: $remindDaysBefore) {
                        ForEach(dayOptions, id: \.0) { option in
                            Text(option.1).tag(option.0)
                        }
                    }
                    .disabled(!barkEnabled)
                }
                
                // Messages
                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
                
                if let success = successMessage {
                    Section {
                        Text(success)
                            .foregroundColor(.green)
                            .font(.caption)
                    }
                }
                
                // Save Button
                Section {
                    Button(action: saveSettings) {
                        HStack {
                            Spacer()
                            if isSaving {
                                ProgressView()
                                    .padding(.trailing, 8)
                            }
                            Text(isSaving ? "Saving..." : "Save Settings")
                                .fontWeight(.semibold)
                            Spacer()
                        }
                    }
                    .disabled(isSaving)
                }
            }
        }
        .navigationTitle("Notification Settings")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear(perform: loadSettings)
    }
    
    private func loadSettings() {
        isLoading = true
        errorMessage = nil
        
        NotificationSettingService.shared.getSettings()
            .receive(on: DispatchQueue.main)
            .sink { completion in
                isLoading = false
                if case .failure(let error) = completion {
                    switch error {
                    case .serverError(let message):
                        errorMessage = message
                    default:
                        // If no settings exist yet, just use defaults
                        break
                    }
                }
            } receiveValue: { settings in
                barkApiUrl = settings.barkApiUrl
                barkEnabled = settings.barkEnabled
                timezone = settings.timezone.isEmpty ? TimeZone.current.identifier : settings.timezone
                remindHour = settings.remindHour
                remindDaysBefore = settings.remindDaysBefore
            }
            .store(in: &cancellables)
    }
    
    private func saveSettings() {
        isSaving = true
        errorMessage = nil
        successMessage = nil
        
        let request = CreateOrUpdateNotificationSettingRequest(
            barkApiUrl: barkApiUrl,
            barkEnabled: barkEnabled,
            timezone: timezone,
            remindHour: remindHour,
            remindDaysBefore: remindDaysBefore
        )
        
        NotificationSettingService.shared.createOrUpdate(request: request)
            .receive(on: DispatchQueue.main)
            .sink { completion in
                isSaving = false
                if case .failure(let error) = completion {
                    switch error {
                    case .serverError(let message):
                        errorMessage = message
                    default:
                        errorMessage = "Failed to save settings. Please try again."
                    }
                }
            } receiveValue: { _ in
                successMessage = "Settings saved successfully!"
                // Clear success message after 3 seconds
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    successMessage = nil
                }
            }
            .store(in: &cancellables)
    }
}

struct NotificationSettingsView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            NotificationSettingsView()
        }
    }
}
