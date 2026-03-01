//
//  RemindersListView.swift
//  JiceotApp
//
//  Created for Reminders feature.
//

import SwiftUI

struct RemindersListView: View {
    @StateObject private var viewModel = ReminderViewModel()
    @State private var showingAddReminder = false
    @State private var selectedReminder: Reminder?
    @State private var showingDeleteAlert = false
    @State private var reminderToDelete: Reminder?
    @State private var showAll = false
    @State private var searchText = ""

    private var localTimezone: String {
        TimeZone.current.identifier
    }
    
    var filteredReminders: [Reminder] {
        if searchText.isEmpty {
            return viewModel.reminders
        } else {
            return viewModel.reminders.filter {
                $0.title.localizedCaseInsensitiveContains(searchText) ||
                $0.detail.localizedCaseInsensitiveContains(searchText)
            }
        }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.isLoading && viewModel.reminders.isEmpty {
                    LoadingView()
                } else if viewModel.reminders.isEmpty {
                    emptyStateView
                } else {
                    List {
                        Text("Your local timezone: \(localTimezone)")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Toggle("Show All", isOn: $showAll)
                            .onChange(of: showAll) { newValue in
                                viewModel.loadReminders(showAll: newValue)
                            }
                        
                        ForEach(filteredReminders) { reminder in
                            ReminderRow(reminder: reminder)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    selectedReminder = reminder
                                }
                                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                    Button(role: .destructive) {
                                        reminderToDelete = reminder
                                        showingDeleteAlert = true
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                    
                                    Button {
                                        viewModel.toggleReminder(reminder)
                                    } label: {
                                        Label(
                                            reminder.isActive ? "Deactivate" : "Activate",
                                            systemImage: reminder.isActive ? "bell.slash" : "bell"
                                        )
                                    }
                                    .tint(reminder.isActive ? .orange : .green)
                                }
                                .swipeActions(edge: .leading, allowsFullSwipe: false) {
                                    Button {
                                        selectedReminder = reminder
                                    } label: {
                                        Label("Edit", systemImage: "pencil")
                                    }
                                    .tint(.blue)
                                }
                        }
                    }
                    .listStyle(InsetGroupedListStyle())
                    .searchable(text: $searchText, prompt: "Search reminders")
                    .refreshable {
                        viewModel.loadReminders(showAll: showAll)
                    }
                }
            }
            .navigationTitle("Reminders")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingAddReminder = true
                    }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddReminder) {
                ReminderFormView(reminder: nil) { _ in
                    viewModel.loadReminders(showAll: showAll)
                }
            }
            .sheet(item: $selectedReminder) { reminder in
                ReminderFormView(reminder: reminder) { _ in
                    viewModel.loadReminders(showAll: showAll)
                }
            }
            .alert("Delete Reminder", isPresented: $showingDeleteAlert) {
                Button("Cancel", role: .cancel) {
                    reminderToDelete = nil
                }
                Button("Delete", role: .destructive) {
                    if let reminder = reminderToDelete {
                        viewModel.deleteReminder(reminder)
                    }
                    reminderToDelete = nil
                }
            } message: {
                Text("Are you sure you want to delete this reminder?")
            }
            .alert("Success", isPresented: .constant(viewModel.successMessage != nil)) {
                Button("OK") {
                    viewModel.successMessage = nil
                }
            } message: {
                if let message = viewModel.successMessage {
                    Text(message)
                }
            }
        }
    }
    
    var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "bell.badge")
                .font(.system(size: 64))
                .foregroundColor(.gray)
            
            Text("No Reminders")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Create your first reminder to stay on top of things")
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Button(action: {
                showingAddReminder = true
            }) {
                Text("Add Reminder")
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color("AccentColor"))
                    .cornerRadius(8)
            }
        }
    }
}

// MARK: - Reminder Row
struct ReminderRow: View {
    let reminder: Reminder
    
    var body: some View {
        HStack(spacing: 12) {
            // Status icon
            Image(systemName: reminder.isActive ? "bell.fill" : "bell.slash.fill")
                .font(.system(size: 20))
                .foregroundColor(reminder.isActive ? .blue : .gray)
                .frame(width: 40, height: 40)
                .background(
                    (reminder.isActive ? Color.blue : Color.gray).opacity(0.15)
                )
                .cornerRadius(10)
            
            // Info
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(reminder.title)
                        .font(.headline)
                    
                    if !reminder.isActive {
                        Text(reminder.completedAt != nil ? "Done" : "Off")
                            .font(.caption)
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(reminder.completedAt != nil ? Color.green : Color.gray)
                            .cornerRadius(4)
                    }
                }
                
                if !reminder.detail.isEmpty {
                    Text(reminder.detail)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                
                HStack(spacing: 8) {
                    Text(reminder.recurrenceDescription)
                        .font(.caption)
                        .foregroundColor(recurrenceColor)

                    Text("•")
                        .font(.caption)
                        .foregroundColor(.gray)

                    Text("TZ: \(reminder.timezone)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if reminder.isActive {
                        Text("•")
                            .font(.caption)
                            .foregroundColor(.gray)
                        
                        Text("Next: \(formatNextRemind(reminder.nextRemindAt))")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding(.vertical, 4)
        .opacity(reminder.isActive ? 1.0 : 0.6)
    }
    
    private var recurrenceColor: Color {
        switch reminder.recurrenceType {
        case "none": return .gray
        case "daily": return .blue
        case "weekly": return .green
        case "monthly": return .purple
        case "yearly": return .orange
        default: return .gray
        }
    }
    
    private func formatNextRemind(_ dateStr: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        guard let date = formatter.date(from: dateStr) ?? ISO8601DateFormatter().date(from: dateStr) else {
            return dateStr
        }
        
        let now = Date()
        let diff = Calendar.current.dateComponents([.day], from: now, to: date)
        
        if let days = diff.day {
            if days < 0 { return "Overdue" }
            if days == 0 { return "Today" }
            if days == 1 { return "Tomorrow" }
            if days <= 7 { return "In \(days) days" }
        }
        
        let df = DateFormatter()
        df.dateStyle = .medium
        return df.string(from: date)
    }
}

struct RemindersListView_Previews: PreviewProvider {
    static var previews: some View {
        RemindersListView()
    }
}
