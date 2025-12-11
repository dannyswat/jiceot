//
//  DashboardView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @State private var showingDueBills = false
    @State private var showingAddPayment = false
    @State private var selectedBillTypeId: Int?
    @State private var selectedAmount: String?
    
    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.isLoading && viewModel.stats == nil {
                    LoadingView()
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                            // Header
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Dashboard")
                                        .font(.system(size: 32, weight: .bold))
                                    Text(Date().formatted("MMMM yyyy"))
                                        .font(.subheadline)
                                        .foregroundColor(.gray)
                                }
                                
                                Spacer()
                                
                                Button(action: {
                                    showingDueBills = true
                                }) {
                                    Image(systemName: "clock.fill")
                                        .font(.title2)
                                        .foregroundColor(Color("AccentColor"))
                                }
                            }
                            .padding(.horizontal)
                            .padding(.top, 8)
                            
                            // Stats Cards
                            if let stats = viewModel.stats {
                                statsSection(stats: stats)
                                
                                // On-Demand Bills
                                if !stats.onDemandBills.isEmpty {
                                    onDemandBillsSection(bills: stats.onDemandBills)
                                }
                                
                                // Upcoming Bills
                                if !stats.upcomingBills.isEmpty {
                                    upcomingBillsSection(bills: stats.upcomingBills)
                                }
                            }
                            
                            // Error Message
                            if let errorMessage = viewModel.errorMessage {
                                VStack(spacing: 12) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .font(.system(size: 48))
                                        .foregroundColor(.orange)
                                    
                                    Text(errorMessage)
                                        .foregroundColor(.gray)
                                        .multilineTextAlignment(.center)
                                    
                                    Button(action: {
                                        viewModel.refresh()
                                    }) {
                                        Text("Retry")
                                            .fontWeight(.semibold)
                                            .foregroundColor(Color("AccentColor"))
                                    }
                                }
                                .padding()
                            }
                        }
                        .padding(.bottom, 24)
                    }
                    .refreshable {
                        viewModel.refresh()
                    }
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showingDueBills) {
                DueBillsView()
            }
            .sheet(isPresented: $showingAddPayment) {
                BillPaymentFormView(
                    payment: nil,
                    preselectedBillTypeId: selectedBillTypeId,
                    preselectedAmount: selectedAmount
                ) { _ in
                    viewModel.refresh()
                    selectedBillTypeId = nil
                    selectedAmount = nil
                }
            }
        }
    }
    
    // MARK: - Stats Section
    @ViewBuilder
    private func statsSection(stats: DashboardStats) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                StatCard(
                    title: "Bills Paid",
                    value: "\(stats.billsPaid)",
                    icon: "checkmark.circle.fill",
                    color: .blue
                )
                
                StatCard(
                    title: "Pending Bills",
                    value: "\(stats.pendingBills)",
                    icon: "clock.fill",
                    color: .orange
                )
                
                StatCard(
                    title: "Total Expenses",
                    value: String(format: "$%.0f", stats.totalExpenses),
                    icon: "dollarsign.circle.fill",
                    color: Color(hex: Constants.Colors.primaryYellow)
                )
                .gridCellColumns(2)
            }
        }
        .padding(.horizontal)
    }
    
    // MARK: - On-Demand Bills Section
    @ViewBuilder
    private func onDemandBillsSection(bills: [BillTypeInfo]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("On-Demand Bills")
                .font(.title3)
                .fontWeight(.semibold)
                .padding(.horizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(bills) { bill in
                        OnDemandBillCard(bill: bill)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
    
    // MARK: - Upcoming Bills Section
    @ViewBuilder
    private func upcomingBillsSection(bills: [UpcomingBill]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Upcoming Bills")
                    .font(.title3)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Text("Next 30 Days")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            .padding(.horizontal)
            
            VStack(spacing: 8) {
                ForEach(bills) { bill in
                    UpcomingBillRow(bill: bill)
                }
            }
            .padding(.horizontal)
        }
    }
}

// MARK: - On-Demand Bill Card
struct OnDemandBillCard: View {
    let bill: BillTypeInfo
    @State private var showingAddPayment = false
    
    var body: some View {
        Button(action: {
            showingAddPayment = true
        }) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(bill.icon)
                        .font(.system(size: 32))
                        .frame(width: 50, height: 50)
                        .background(Color(hex: bill.color).opacity(0.2))
                        .cornerRadius(10)
                    
                    Spacer()
                }
                
                Text(bill.name)
                    .font(.headline)
                    .lineLimit(2)
                    .frame(height: 40, alignment: .top)
                    .foregroundColor(.primary)
                
                if !bill.fixedAmount.isEmpty {
                    Text(bill.fixedAmount.toCurrency())
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(Color("AccentColor"))
                } else {
                    Text("Variable")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
            .padding()
            .frame(width: 160, height: 160)
            .background(Color.gray.opacity(0.1))
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
        .sheet(isPresented: $showingAddPayment) {
            BillPaymentFormView(
                payment: nil,
                preselectedBillTypeId: bill.id,
                preselectedAmount: bill.fixedAmount.isEmpty ? nil : bill.fixedAmount
            ) { _ in
                // Refresh dashboard
            }
        }
    }
}

// MARK: - Upcoming Bill Row
struct UpcomingBillRow: View {
    let bill: UpcomingBill
    @State private var showingAddPayment = false
    
    var body: some View {
        Button(action: {
            showingAddPayment = true
        }) {
            HStack(spacing: 12) {
                // Icon
                Text(bill.icon)
                    .font(.system(size: 24))
                    .frame(width: 48, height: 48)
                    .background(Color(hex: bill.color).opacity(0.2))
                    .cornerRadius(10)
                
                // Bill Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(bill.name)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(formatDueDate(bill.nextDueDate))
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                // Amount
                if !bill.fixedAmount.isEmpty {
                    Text(bill.fixedAmount.toCurrency())
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                }
            }
            .padding()
            .background(Color.gray.opacity(0.05))
            .cornerRadius(10)
        }
        .buttonStyle(PlainButtonStyle())
        .sheet(isPresented: $showingAddPayment) {
            BillPaymentFormView(
                payment: nil,
                preselectedBillTypeId: bill.id,
                preselectedAmount: bill.fixedAmount.isEmpty ? nil : bill.fixedAmount
            ) { _ in
                // Refresh dashboard
            }
        }
    }
    
    private func formatDueDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }
        
        let calendar = Calendar.current
        let now = Date()
        
        if calendar.isDateInToday(date) {
            return "Due Today"
        } else if calendar.isDateInTomorrow(date) {
            return "Due Tomorrow"
        } else {
            let outputFormatter = DateFormatter()
            outputFormatter.dateFormat = "MMM d"
            return "Due " + outputFormatter.string(from: date)
        }
    }
}

struct DashboardView_Previews: PreviewProvider {
    static var previews: some View {
        DashboardView()
            .environmentObject(AuthViewModel())
    }
}
