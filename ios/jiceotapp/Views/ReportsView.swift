//
//  ReportsView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI

struct ReportsView: View {
    @StateObject private var viewModel = ReportsViewModel()
    @State private var selectedYear: Int = Calendar.current.component(.year, from: Date())
    @State private var selectedMonth: Int = Calendar.current.component(.month, from: Date())
    @State private var reportType: ReportType = .monthly
    
    private let currentYear = Calendar.current.component(.year, from: Date())
    private let years: [Int] = {
        let current = Calendar.current.component(.year, from: Date())
        return Array((current - 5)...current).reversed()
    }()
    
    private let months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Report Type Selector
                Picker("Report Type", selection: $reportType) {
                    Text("Monthly").tag(ReportType.monthly)
                    Text("Yearly").tag(ReportType.yearly)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                .onChange(of: reportType) { _ in
                    loadReport()
                }
                
                // Date Selectors
                if reportType == .monthly {
                    monthlySelectors
                } else {
                    yearlySelectors
                }
                
                // Content
                if reportType == .monthly {
                    monthlyReportContent
                } else {
                    yearlyReportContent
                }
            }
            .navigationTitle("Reports")
            .onAppear {
                loadReport()
            }
        }
    }
    
    private var monthlySelectors: some View {
        HStack {
            MonthYearPicker(selectedMonth: $selectedMonth, selectedYear: $selectedYear)
                .onChange(of: selectedMonth) { _ in
                    loadReport()
                }
                .onChange(of: selectedYear) { _ in
                    loadReport()
                }
            Spacer()
        }
        .padding(.horizontal)
        .padding(.bottom)
    }
    
    private var yearlySelectors: some View {
        HStack {
            Menu {
                ForEach(years, id: \.self) { year in
                    Button(action: {
                        selectedYear = year
                        loadReport()
                    }) {
                        HStack {
                            Text(String(year))
                            if selectedYear == year {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            } label: {
                HStack {
                    Text(String(selectedYear))
                        .foregroundColor(.primary)
                    Image(systemName: "chevron.down")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color(.systemGray6))
                .cornerRadius(8)
            }
            Spacer()
        }
        .padding(.horizontal)
        .padding(.bottom)
    }
    
    private var monthlyReportContent: some View {
        Group {
            if viewModel.isLoadingMonthly {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.largeTitle)
                        .foregroundColor(.orange)
                    Text(error)
                        .multilineTextAlignment(.center)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding()
            } else if let report = viewModel.monthlyReport {
                MonthlyReportContentView(report: report)
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "chart.bar.doc.horizontal")
                        .font(.largeTitle)
                        .foregroundColor(.secondary)
                    Text("No report data available")
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }
    
    private var yearlyReportContent: some View {
        Group {
            if viewModel.isLoadingYearly {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.largeTitle)
                        .foregroundColor(.orange)
                    Text(error)
                        .multilineTextAlignment(.center)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding()
            } else if let report = viewModel.yearlyReport {
                YearlyReportContentView(report: report)
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "chart.bar.doc.horizontal")
                        .font(.largeTitle)
                        .foregroundColor(.secondary)
                    Text("No report data available")
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }
    
    private func loadReport() {
        if reportType == .monthly {
            viewModel.loadMonthlyReport(year: selectedYear, month: selectedMonth)
        } else {
            viewModel.loadYearlyReport(year: selectedYear)
        }
    }
}

// MARK: - Monthly Report Content
struct MonthlyReportContentView: View {
    let report: MonthlyReport
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Summary Cards
                summarySection
                
                // Expense Breakdown Chart
                if !report.expenseTypeBreakdown.isEmpty {
                    expenseBreakdownSection
                }
                
                // Bill Breakdown
                if !report.billTypeBreakdown.isEmpty {
                    billBreakdownSection
                }
            }
            .padding()
        }
    }
    
    private var summarySection: some View {
        VStack(spacing: 12) {
            SummaryCard(
                title: "Bill Payments",
                amount: formatCurrency(report.billAmount),
                color: .blue,
                icon: "creditcard.fill"
            )
            
            SummaryCard(
                title: "Expenses",
                amount: formatCurrency(report.expenseAmount),
                color: .orange,
                icon: "cart.fill"
            )
            
            SummaryCard(
                title: "Total",
                amount: formatCurrency(report.totalAmount),
                color: .purple,
                icon: "chart.bar.fill"
            )
            
            if report.unexplainedPayment > 0 {
                SummaryCard(
                    title: "Unexplained",
                    amount: formatCurrency(report.unexplainedPayment),
                    color: .red,
                    icon: "exclamationmark.triangle.fill"
                )
            }
        }
    }
    
    private var expenseBreakdownSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Expense Breakdown")
                .font(.headline)
                .padding(.horizontal, 4)
            
            VStack(spacing: 0) {
                ForEach(Array(report.expenseTypeBreakdown.keys.sorted()), id: \.self) { key in
                    if let breakdown = report.expenseTypeBreakdown[key] {
                        TypeBreakdownRow(name: key, breakdown: breakdown)
                        
                        if key != report.expenseTypeBreakdown.keys.sorted().last {
                            Divider()
                        }
                    }
                }
            }
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
        }
    }
    
    private var billBreakdownSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Bill Payments")
                .font(.headline)
                .padding(.horizontal, 4)
            
            VStack(spacing: 0) {
                ForEach(Array(report.billTypeBreakdown.keys.sorted()), id: \.self) { key in
                    if let breakdown = report.billTypeBreakdown[key] {
                        TypeBreakdownRow(name: key, breakdown: breakdown)
                        
                        if key != report.billTypeBreakdown.keys.sorted().last {
                            Divider()
                        }
                    }
                }
            }
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
        }
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}

// MARK: - Yearly Report Content
struct YearlyReportContentView: View {
    let report: YearlyReport
    
    private let monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Summary Cards
                summarySection
                
                // Monthly Trend Chart
                monthlyTrendSection
                
                // Monthly Breakdown
                monthlyBreakdownSection
            }
            .padding()
        }
    }
    
    private var summarySection: some View {
        VStack(spacing: 12) {
            SummaryCard(
                title: "Total Bill Payments",
                amount: formatCurrency(report.summary.totalBillAmount),
                color: .blue,
                icon: "creditcard.fill"
            )
            
            SummaryCard(
                title: "Total Expenses",
                amount: formatCurrency(report.summary.totalExpenseAmount),
                color: .orange,
                icon: "cart.fill"
            )
            
            SummaryCard(
                title: "Grand Total",
                amount: formatCurrency(report.summary.totalAmount),
                color: .purple,
                icon: "chart.bar.fill"
            )
            
            SummaryCard(
                title: "Monthly Average",
                amount: formatCurrency(report.summary.averageMonthly),
                color: .green,
                icon: "chart.line.uptrend.xyaxis"
            )
        }
    }
    
    private var monthlyTrendSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Monthly Trend")
                .font(.headline)
                .padding(.horizontal, 4)
            
            VStack(spacing: 16) {
                // Simple bar chart
                HStack(alignment: .bottom, spacing: 4) {
                    ForEach(0..<12, id: \.self) { index in
                        VStack(spacing: 4) {
                            if let monthReport = report.months.first(where: { $0.month == index + 1 }) {
                                let total = monthReport.totalAmount
                                let maxAmount = report.months.map { $0.totalAmount }.max() ?? 1
                                let height = total > 0 ? CGFloat(total) / CGFloat(maxAmount) * 120 : 4
                                
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.purple)
                                    .frame(height: height)
                            } else {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color.gray.opacity(0.2))
                                    .frame(height: 4)
                            }
                            
                            Text(monthNames[index])
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .frame(height: 140)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
        }
    }
    
    private var monthlyBreakdownSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Monthly Breakdown")
                .font(.headline)
                .padding(.horizontal, 4)
            
            VStack(spacing: 0) {
                ForEach(report.months.sorted(by: { $0.month > $1.month }), id: \.month) { monthReport in
                    MonthlyBreakdownRow(report: monthReport, monthNames: monthNames)
                    
                    if monthReport.month != report.months.map({ $0.month }).min() {
                        Divider()
                    }
                }
            }
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
        }
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}

// MARK: - Supporting Views
struct SummaryCard: View {
    let title: String
    let amount: String
    let color: Color
    let icon: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
                .frame(width: 40)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Text(amount)
                    .font(.title2)
                    .fontWeight(.semibold)
            }
            
            Spacer()
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

struct TypeBreakdownRow: View {
    let name: String
    let breakdown: TypeBreakdownItem
    
    var body: some View {
        HStack(spacing: 12) {
            // Icon
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(hex: breakdown.color) ?? .gray)
                    .frame(width: 40, height: 40)
                
                Text(breakdown.icon)
                    .font(.system(size: 20))
            }
            
            // Name and count
            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.body)
                Text("\(breakdown.count) item\(breakdown.count != 1 ? "s" : "")")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Amount
            Text(formatCurrency(breakdown.amount))
                .font(.body)
                .fontWeight(.semibold)
        }
        .padding()
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}

struct MonthlyBreakdownRow: View {
    let report: MonthlyReport
    let monthNames: [String]
    
    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text(monthNames[report.month - 1])
                    .font(.headline)
                Spacer()
                Text(formatCurrency(report.totalAmount))
                    .font(.headline)
                    .fontWeight(.bold)
            }
            
            HStack {
                Label("Bills", systemImage: "creditcard.fill")
                    .font(.caption)
                    .foregroundColor(.blue)
                Spacer()
                Text(formatCurrency(report.billAmount))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            HStack {
                Label("Expenses", systemImage: "cart.fill")
                    .font(.caption)
                    .foregroundColor(.orange)
                Spacer()
                Text(formatCurrency(report.expenseAmount))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
    }
    
    private func formatCurrency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}

struct ReportsView_Previews: PreviewProvider {
    static var previews: some View {
        ReportsView()
    }
}
