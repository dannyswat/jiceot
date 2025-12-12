//
//  BillsMainView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI

struct BillsMainView: View {
    @State private var selectedSegment = 0
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Segment Control
                Picker("View", selection: $selectedSegment) {
                    Text("Due").tag(0)
                    Text("Payments").tag(1)
                    Text("Types").tag(2)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                
                // Content
                if selectedSegment == 0 {
                    BillDueContentView()
                } else if selectedSegment == 1 {
                    BillPaymentsContentView()
                } else {
                    BillTypesContentView()
                }
            }
            .navigationTitle("Bills")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

// MARK: - Bill Due Content
struct BillDueContentView: View {
    @StateObject private var viewModel = DueBillsViewModel()
    @State private var selectedYear: Int = Date().year
    @State private var selectedMonth: Int = Date().month
    @State private var selectedBillTypeId: Int?
    @State private var selectedAmount: String?
    @State private var showingAddPayment = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Month/Year Picker
            HStack {
                MonthYearPicker(selectedMonth: $selectedMonth, selectedYear: $selectedYear)
                    .onChange(of: selectedMonth) { month in
                        viewModel.loadDueBills(year: selectedYear, month: month)
                    }
                    .onChange(of: selectedYear) { year in
                        viewModel.loadDueBills(year: year, month: selectedMonth)
                    }
                Spacer()
            }
            .padding()
            .background(Color(.systemBackground))
            
            // Bills List
            ZStack {
                if viewModel.isLoading {
                    LoadingView()
                } else if viewModel.dueBills.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "checkmark.circle")
                            .font(.system(size: 64))
                            .foregroundColor(.green)
                        
                        Text("All Caught Up!")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Text("No bills due for \(monthName(selectedMonth)) \(selectedYear)")
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                } else {
                    List {
                        ForEach(viewModel.dueBills) { bill in
                            DueBillRow(bill: bill)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    selectedBillTypeId = bill.id
                                    selectedAmount = bill.lastPaymentAmount
                                    showingAddPayment = true
                                }
                        }
                    }
                    .listStyle(InsetGroupedListStyle())
                    .refreshable {
                        viewModel.loadDueBills(year: selectedYear, month: selectedMonth)
                    }
                }
            }
        }
        .sheet(isPresented: $showingAddPayment) {
            BillPaymentFormView(
                payment: nil,
                preselectedBillTypeId: selectedBillTypeId,
                preselectedAmount: selectedAmount,
                preselectedYear: selectedYear,
                preselectedMonth: selectedMonth
            ) { _ in
                viewModel.loadDueBills(year: selectedYear, month: selectedMonth)
                selectedBillTypeId = nil
                selectedAmount = nil
            }
        }
        .onAppear {
            viewModel.loadDueBills(year: selectedYear, month: selectedMonth)
        }
    }
    
    private func monthName(_ month: Int) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM"
        let date = Calendar.current.date(from: DateComponents(year: 2024, month: month, day: 1)) ?? Date()
        return formatter.string(from: date)
    }
}

// MARK: - Due Bill Row
struct DueBillRow: View {
    let bill: DueBill
    
    var statusColor: Color {
        switch bill.status.lowercased() {
        case "paid":
            return .green
        case "overdue":
            return .red
        case "due":
            return .orange
        default:
            return .blue
        }
    }
    
    var statusText: String {
        bill.status.capitalized
    }
    
    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Text(bill.icon)
                .font(.system(size: 28))
                .frame(width: 50, height: 50)
                .background(Color(hex: bill.color).opacity(0.2))
                .cornerRadius(10)
            
            // Bill Info
            VStack(alignment: .leading, spacing: 4) {
                Text(bill.name)
                    .font(.headline)
                
                HStack(spacing: 4) {
                    Text(statusText)
                        .font(.caption)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(statusColor)
                        .cornerRadius(4)
                    
                    if let lastDate = bill.lastPaymentDate {
                        Text("Last: \(formatDate(lastDate))")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
            }
            
            Spacer()
            
            // Amount
            if let amount = bill.lastPaymentAmount {
                Text(CurrencyFormatter.format(amount))
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
            }
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding(.vertical, 4)
        .opacity(bill.status.lowercased() == "paid" ? 0.6 : 1.0)
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        if let date = formatter.date(from: dateString) {
            formatter.dateFormat = "MMM d"
            return formatter.string(from: date)
        }
        
        return dateString
    }
}

// MARK: - Bill Payments Content (without NavigationView wrapper)
struct BillPaymentsContentView: View {
    @StateObject private var viewModel = BillPaymentViewModel()
    @State private var showingAddPayment = false
    @State private var selectedPayment: BillPayment?
    @State private var showingDeleteAlert = false
    @State private var paymentToDelete: BillPayment?
    @State private var selectedYear: Int
    @State private var selectedMonth: Int
    @State private var searchText = ""
    
    init() {
        let calendar = Calendar.current
        let now = Date()
        _selectedYear = State(initialValue: calendar.component(.year, from: now))
        _selectedMonth = State(initialValue: calendar.component(.month, from: now))
    }
    
    var filteredPayments: [BillPayment] {
        if searchText.isEmpty {
            return viewModel.billPayments
        } else {
            return viewModel.billPayments.filter {
                $0.billType?.name.localizedCaseInsensitiveContains(searchText) ?? false ||
                $0.note.localizedCaseInsensitiveContains(searchText)
            }
        }
    }
    
    var groupedPaymentsByBillType: [(billType: String, icon: String, color: String, payments: [BillPayment])] {
        let grouped = Dictionary(grouping: filteredPayments) { payment -> String in
            payment.billType?.name ?? "Unknown"
        }
        
        return grouped.map { billTypeName, payments in
            let payment = payments.first!
            return (
                billType: billTypeName,
                icon: payment.billType?.icon ?? "💳",
                color: payment.billType?.color ?? "#6366F1",
                payments: payments.sorted { $0.id > $1.id }
            )
        }.sorted { $0.billType < $1.billType }
    }
    
    var totalAmount: Double {
        filteredPayments.reduce(0) { sum, payment in
            sum + (Double(payment.amount) ?? 0)
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Month/Year Picker
            HStack {
                MonthYearPicker(selectedMonth: $selectedMonth, selectedYear: $selectedYear)
                
                Spacer()
                
                Button(action: {
                    showingAddPayment = true
                }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(Color("AccentColor"))
                }
            }
            .padding()
            .background(Color(.systemBackground))
            
            // Total Amount
            HStack {
                Text("Total:")
                    .font(.subheadline)
                    .foregroundColor(.gray)
                
                Spacer()
                
                Text(String(format: "$%.2f", totalAmount))
                    .font(.title3)
                    .fontWeight(.semibold)
                    .foregroundColor(Color("AccentColor"))
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(Color(.systemGray6))
            
            // Bill Payments List
            ZStack {
                if viewModel.isLoading && viewModel.billPayments.isEmpty {
                    LoadingView()
                } else if viewModel.billPayments.isEmpty {
                    emptyStateView
                } else {
                    List {
                        ForEach(groupedPaymentsByBillType, id: \.billType) { group in
                            Section(header: HStack {
                                Text(group.icon)
                                Text(group.billType)
                            }) {
                                ForEach(group.payments) { payment in
                                    BillPaymentRow(payment: payment)
                                        .contentShape(Rectangle())
                                        .onTapGesture {
                                            selectedPayment = payment
                                        }
                                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                            Button(role: .destructive) {
                                                paymentToDelete = payment
                                                showingDeleteAlert = true
                                            } label: {
                                                Label("Delete", systemImage: "trash")
                                            }
                                        }
                                        .swipeActions(edge: .leading, allowsFullSwipe: false) {
                                            Button {
                                                selectedPayment = payment
                                            } label: {
                                                Label("Edit", systemImage: "pencil")
                                            }
                                            .tint(.blue)
                                        }
                                }
                            }
                        }
                    }
                    .listStyle(InsetGroupedListStyle())
                    .searchable(text: $searchText, prompt: "Search payments")
                    .refreshable {
                        viewModel.refresh(year: selectedYear, month: selectedMonth)
                    }
                }
            }
        }
        .sheet(isPresented: $showingAddPayment) {
            BillPaymentFormView(
                payment: nil,
                preselectedYear: selectedYear,
                preselectedMonth: selectedMonth
            ) { _ in
                viewModel.refresh(year: selectedYear, month: selectedMonth)
            }
        }
        .sheet(item: $selectedPayment) { payment in
            BillPaymentFormView(
                payment: payment,
                preselectedYear: selectedYear,
                preselectedMonth: selectedMonth
            ) { _ in
                viewModel.refresh(year: selectedYear, month: selectedMonth)
            }
        }
        .alert("Delete Payment", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) {
                paymentToDelete = nil
            }
            Button("Delete", role: .destructive) {
                if let payment = paymentToDelete {
                    viewModel.deleteBillPayment(payment)
                }
                paymentToDelete = nil
            }
        } message: {
            Text("Are you sure you want to delete this payment? This action cannot be undone.")
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
        .onChange(of: selectedYear) { _ in
            viewModel.loadBillPayments(year: selectedYear, month: selectedMonth)
        }
        .onChange(of: selectedMonth) { _ in
            viewModel.loadBillPayments(year: selectedYear, month: selectedMonth)
        }
        .onAppear {
            viewModel.loadBillPayments(year: selectedYear, month: selectedMonth)
        }
    }
    
    var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text")
                .font(.system(size: 64))
                .foregroundColor(.gray)
            
            Text("No Payments")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("No bill payments found for \(monthName(selectedMonth)) \(selectedYear)")
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Button(action: {
                showingAddPayment = true
            }) {
                Text("Add Payment")
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color("AccentColor"))
                    .cornerRadius(8)
            }
        }
    }
    
    private func monthName(_ month: Int) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM"
        let date = Calendar.current.date(from: DateComponents(year: 2024, month: month, day: 1)) ?? Date()
        return formatter.string(from: date)
    }
}

// MARK: - Bill Types Content (without NavigationView wrapper)
struct BillTypesContentView: View {
    @StateObject private var viewModel = BillTypeViewModel()
    @State private var showingAddBillType = false
    @State private var selectedBillType: BillType?
    @State private var showingDeleteAlert = false
    @State private var billTypeToDelete: BillType?
    @State private var searchText = ""
    
    var filteredBillTypes: [BillType] {
        if searchText.isEmpty {
            return viewModel.billTypes
        } else {
            return viewModel.billTypes.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                Button(action: {
                    showingAddBillType = true
                }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(Color("AccentColor"))
                }
            }
            .padding()
            .background(Color(.systemBackground))
            
            ZStack {
                if viewModel.isLoading && viewModel.billTypes.isEmpty {
                    LoadingView()
                } else if viewModel.billTypes.isEmpty {
                    emptyStateView
                } else {
                    List {
                        ForEach(filteredBillTypes) { billType in
                            BillTypeRow(billType: billType)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    selectedBillType = billType
                                }
                                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                    Button(role: .destructive) {
                                        billTypeToDelete = billType
                                        showingDeleteAlert = true
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                    
                                    Button {
                                        viewModel.toggleBillType(billType)
                                    } label: {
                                        Label(
                                            billType.stopped ? "Enable" : "Disable",
                                            systemImage: billType.stopped ? "checkmark.circle" : "xmark.circle"
                                        )
                                    }
                                    .tint(billType.stopped ? .green : .orange)
                                }
                                .swipeActions(edge: .leading, allowsFullSwipe: false) {
                                    Button {
                                        selectedBillType = billType
                                    } label: {
                                        Label("Edit", systemImage: "pencil")
                                    }
                                    .tint(.blue)
                                }
                        }
                    }
                    .listStyle(InsetGroupedListStyle())
                    .searchable(text: $searchText, prompt: "Search bill types")
                    .refreshable {
                        viewModel.refresh()
                    }
                }
            }
        }
        .sheet(isPresented: $showingAddBillType) {
            BillTypeFormView(billType: nil) { _ in
                viewModel.refresh()
            }
        }
        .sheet(item: $selectedBillType) { billType in
            BillTypeFormView(billType: billType) { _ in
                viewModel.refresh()
            }
        }
        .alert("Delete Bill Type", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) {
                billTypeToDelete = nil
            }
            Button("Delete", role: .destructive) {
                if let billType = billTypeToDelete {
                    viewModel.deleteBillType(billType)
                }
                billTypeToDelete = nil
            }
        } message: {
            Text("Are you sure you want to delete this bill type? This action cannot be undone.")
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
    
    var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "creditcard")
                .font(.system(size: 64))
                .foregroundColor(.gray)
            
            Text("No Bill Types")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Create your first bill type to start tracking recurring bills")
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Button(action: {
                showingAddBillType = true
            }) {
                Text("Add Bill Type")
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

struct BillsMainView_Previews: PreviewProvider {
    static var previews: some View {
        BillsMainView()
    }
}
