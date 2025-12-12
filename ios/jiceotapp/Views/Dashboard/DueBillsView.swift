//
//  DueBillsView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI
import Combine

struct DueBillsView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var viewModel = DueBillsViewModel()
    @State private var selectedYear: Int = Date().year
    @State private var selectedMonth: Int = Date().month
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Filters
                VStack(spacing: 12) {
                    HStack(spacing: 12) {
                        // Year Picker
                        Menu {
                            ForEach(yearRange(), id: \.self) { year in
                                Button(action: {
                                    selectedYear = year
                                    viewModel.loadDueBills(year: year, month: selectedMonth)
                                }) {
                                    HStack {
                                        Text("\(year)")
                                        if year == selectedYear {
                                            Image(systemName: "checkmark")
                                        }
                                    }
                                }
                            }
                        } label: {
                            HStack {
                                Text("\(selectedYear)")
                                    .fontWeight(.medium)
                                Image(systemName: "chevron.down")
                                    .font(.caption)
                            }
                            .foregroundColor(.primary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(8)
                        }
                        
                        // Month Picker
                        Menu {
                            ForEach(1...12, id: \.self) { month in
                                Button(action: {
                                    selectedMonth = month
                                    viewModel.loadDueBills(year: selectedYear, month: month)
                                }) {
                                    HStack {
                                        Text(monthName(month))
                                        if month == selectedMonth {
                                            Image(systemName: "checkmark")
                                        }
                                    }
                                }
                            }
                        } label: {
                            HStack {
                                Text(monthName(selectedMonth))
                                    .fontWeight(.medium)
                                Image(systemName: "chevron.down")
                                    .font(.caption)
                            }
                            .foregroundColor(.primary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(8)
                        }
                        
                        Spacer()
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical, 12)
                .background(Color.white)
                
                Divider()
                
                // Content
                if viewModel.isLoading {
                    LoadingView()
                } else if let errorMessage = viewModel.errorMessage {
                    VStack(spacing: 12) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 48))
                            .foregroundColor(.orange)
                        
                        Text(errorMessage)
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                        
                        Button(action: {
                            viewModel.loadDueBills(year: selectedYear, month: selectedMonth)
                        }) {
                            Text("Retry")
                                .fontWeight(.semibold)
                                .foregroundColor(Color("AccentColor"))
                        }
                    }
                    .padding()
                } else if viewModel.dueBills.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 64))
                            .foregroundColor(.green)
                        
                        Text("All bills paid!")
                            .font(.title3)
                            .fontWeight(.semibold)
                        
                        Text("No due bills for \(monthName(selectedMonth)) \(selectedYear)")
                            .foregroundColor(.gray)
                    }
                    .padding()
                } else {
                    ScrollView {
                        VStack(spacing: 12) {
                            ForEach(viewModel.dueBills) { bill in
                                DueBillCard(
                                    bill: bill,
                                    selectedYear: selectedYear,
                                    selectedMonth: selectedMonth,
                                    onPaymentAdded: {
                                        viewModel.loadDueBills(year: selectedYear, month: selectedMonth)
                                    }
                                )
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Due Bills")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                viewModel.loadDueBills(year: selectedYear, month: selectedMonth)
            }
        }
    }
    
    private func yearRange() -> [Int] {
        let currentYear = Date().year
        return Array((currentYear - 2)...(currentYear + 1))
    }
    
    private func monthName(_ month: Int) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM"
        let date = Calendar.current.date(from: DateComponents(year: 2000, month: month))!
        return formatter.string(from: date)
    }
}

// MARK: - Due Bill Card
struct DueBillCard: View {
    let bill: DueBill
    let selectedYear: Int
    let selectedMonth: Int
    let onPaymentAdded: () -> Void
    @State private var showingAddPayment = false
    
    var body: some View {
        Button(action: {
            showingAddPayment = true
        }) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 12) {
                    // Icon
                    Text(bill.icon)
                        .font(.system(size: 28))
                        .frame(width: 56, height: 56)
                        .background(Color(hex: bill.color).opacity(0.2))
                        .cornerRadius(12)
                    
                    // Bill Info
                    VStack(alignment: .leading, spacing: 4) {
                        Text(bill.name)
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        HStack(spacing: 4) {
                            Text("Bill Day:")
                                .font(.caption)
                                .foregroundColor(.gray)
                            Text("\(bill.billDay)")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(.primary)
                        }
                    }
                    
                    Spacer()
                    
                    // Status Badge
                    statusBadge(status: bill.status)
                }
                
                // Last Payment Info
                if let lastPaymentDate = bill.lastPaymentDate,
                   let lastPaymentAmount = bill.lastPaymentAmount {
                    Divider()
                    
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Last Payment")
                                .font(.caption)
                                .foregroundColor(.gray)
                            Text(formatDate(lastPaymentDate))
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(.primary)
                        }
                        
                        Spacer()
                        
                        Text(CurrencyFormatter.format(lastPaymentAmount))
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                    }
                }
            }
            .padding()
            .background(Color.gray.opacity(0.05))
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(statusColor(status: bill.status).opacity(0.3), lineWidth: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
        .sheet(isPresented: $showingAddPayment) {
            BillPaymentFormView(
                payment: nil,
                preselectedBillTypeId: bill.id,
                preselectedAmount: bill.lastPaymentAmount,
                preselectedYear: selectedYear,
                preselectedMonth: selectedMonth
            ) { _ in
                onPaymentAdded()
            }
        }
    }
    
    @ViewBuilder
    private func statusBadge(status: String) -> some View {
        Text(status.capitalized)
            .font(.caption)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(statusColor(status: status))
            .cornerRadius(8)
    }
    
    private func statusColor(status: String) -> Color {
        switch status.lowercased() {
        case "overdue":
            return Color(hex: Constants.Colors.dangerRed)
        case "due":
            return Color(hex: Constants.Colors.warningAmber)
        case "not due":
            return Color(hex: Constants.Colors.successGreen)
        default:
            return .gray
        }
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }
        
        let outputFormatter = DateFormatter()
        outputFormatter.dateFormat = "MMM d, yyyy"
        return outputFormatter.string(from: date)
    }
}

// MARK: - Due Bills ViewModel
class DueBillsViewModel: ObservableObject {
    @Published var dueBills: [DueBill] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private var cancellables = Set<AnyCancellable>()
    
    func loadDueBills(year: Int, month: Int) {
        isLoading = true
        errorMessage = nil
        
        DashboardService.shared.getDueBills(year: year, month: month)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] completion in
                self?.isLoading = false
                if case .failure(let error) = completion {
                    self?.handleError(error)
                }
            } receiveValue: { [weak self] response in
                self?.dueBills = response.dueBills
            }
            .store(in: &cancellables)
    }
    
    private func handleError(_ error: APIError) {
        switch error {
        case .serverError(let message):
            errorMessage = message
        case .networkError:
            errorMessage = "Network error. Please try again."
        case .unauthorized:
            errorMessage = "Session expired. Please log in again."
        case .decodingError:
            errorMessage = "Data format error. Please try again."
        case .invalidURL, .invalidResponse:
            errorMessage = "Failed to load due bills. Please try again."
        }
    }
}

struct DueBillsView_Previews: PreviewProvider {
    static var previews: some View {
        DueBillsView()
    }
}
