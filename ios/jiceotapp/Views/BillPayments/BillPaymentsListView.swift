//
//  BillPaymentsListView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI

struct BillPaymentsListView: View {
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
        struct BillTypeKey: Hashable {
            let billType: String
            let icon: String
            let color: String
        }
        
        let grouped = Dictionary(grouping: filteredPayments) { payment in
            BillTypeKey(
                billType: payment.billType?.name ?? "Unknown",
                icon: payment.billType?.icon ?? "💳",
                color: payment.billType?.color ?? "#6366F1"
            )
        }
        
        return grouped.map { key, payments in
            (billType: key.billType, icon: key.icon, color: key.color, payments: payments.sorted { $0.id > $1.id })
        }.sorted { $0.billType < $1.billType }
    }
    
    var totalAmount: Double {
        filteredPayments.reduce(0) { sum, payment in
            sum + (Double(payment.amount) ?? 0)
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Month/Year Picker
                HStack {
                    MonthYearPicker(selectedMonth: $selectedMonth, selectedYear: $selectedYear)
                    Spacer()
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
            .navigationTitle("Bill Payments")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingAddPayment = true
                    }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddPayment) {
                BillPaymentFormView(payment: nil) { _ in
                    viewModel.refresh(year: selectedYear, month: selectedMonth)
                }
            }
            .sheet(item: $selectedPayment) { payment in
                BillPaymentFormView(payment: payment) { _ in
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

// MARK: - Bill Payment Row
struct BillPaymentRow: View {
    let payment: BillPayment
    
    var body: some View {
        HStack(spacing: 12) {
            // Payment Info
            VStack(alignment: .leading, spacing: 4) {
                Text(payment.billType?.name ?? "Unknown Bill")
                    .font(.headline)
                
                if !payment.note.isEmpty {
                    Text(payment.note)
                        .font(.caption)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            // Amount
            Text(payment.amount.toCurrency())
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(.primary)
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding(.vertical, 4)
    }
}

struct BillPaymentsListView_Previews: PreviewProvider {
    static var previews: some View {
        BillPaymentsListView()
    }
}
