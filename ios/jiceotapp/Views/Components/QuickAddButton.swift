//
//  QuickAddButton.swift
//  JiceotApp
//
//  Created on 12/12/2025.
//

import SwiftUI

struct QuickAddButton: View {
    @State private var isShowingSheet = false
    @State private var activeTab: QuickAddTab = .expenses
    @State private var expenseTypes: [ExpenseType] = []
    @State private var billTypes: [BillType] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @StateObject private var expenseTypeViewModel = ExpenseTypeViewModel()
    @StateObject private var billTypeViewModel = BillTypeViewModel()
    
    enum QuickAddTab {
        case expenses
        case bills
    }
    
    var body: some View {
        Button(action: {
            isShowingSheet = true
        }) {
            Image(systemName: "plus.circle.fill")
                .font(.system(size: 56))
                .foregroundColor(Color("AccentColor"))
                .background(
                    Circle()
                        .fill(Color(.systemBackground))
                        .frame(width: 44, height: 44)
                )
        }
        .offset(y: -20)
        .sheet(isPresented: $isShowingSheet) {
            NavigationView {
                VStack(spacing: 0) {
                    // Segmented Control
                    Picker("Type", selection: $activeTab) {
                        Text("Expenses").tag(QuickAddTab.expenses)
                        Text("Bills").tag(QuickAddTab.bills)
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding()
                    
                    // Content
                    if isLoading {
                        LoadingView()
                    } else if let errorMessage = errorMessage {
                        VStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 48))
                                .foregroundColor(.orange)
                            
                            Text(errorMessage)
                                .foregroundColor(.gray)
                                .multilineTextAlignment(.center)
                            
                            Button("Retry") {
                                loadData()
                            }
                            .foregroundColor(Color("AccentColor"))
                        }
                        .padding()
                    } else {
                        if activeTab == .expenses {
                            expenseTypesGrid
                        } else {
                            billTypesGrid
                        }
                    }
                }
                .navigationTitle("Quick Add")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button("Close") {
                            isShowingSheet = false
                        }
                    }
                }
            }
            .onAppear {
                loadData()
            }
        }
    }
    
    // MARK: - Expense Types Grid
    @ViewBuilder
    private var expenseTypesGrid: some View {
        if expenseTypes.isEmpty {
            emptyStateView(
                icon: "receipt",
                title: "No Expense Types",
                message: "Create your first expense type to start tracking expenses"
            )
        } else {
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.adaptive(minimum: 100, maximum: 120))
                ], spacing: 16) {
                    ForEach(expenseTypes) { expenseType in
                        NavigationLink(destination: expenseItemFormDestination(expenseType: expenseType)) {
                            QuickAddTypeCard(
                                icon: expenseType.icon,
                                color: expenseType.color,
                                name: expenseType.name,
                                subtitle: nil
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding()
            }
        }
    }
    
    // MARK: - Bill Types Grid
    @ViewBuilder
    private var billTypesGrid: some View {
        if billTypes.isEmpty {
            emptyStateView(
                icon: "creditcard",
                title: "No Bill Types",
                message: "Create your first bill type to start tracking bills"
            )
        } else {
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.adaptive(minimum: 100, maximum: 120))
                ], spacing: 16) {
                    ForEach(sortedBillTypes) { billType in
                        NavigationLink(destination: billPaymentFormDestination(billType: billType)) {
                            QuickAddTypeCard(
                                icon: billType.icon,
                                color: billType.color,
                                name: billType.name,
                                subtitle: billSubtitle(billType)
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                }
                .padding()
            }
        }
    }
    
    // MARK: - Helper Views
    @ViewBuilder
    private func emptyStateView(icon: String, title: String, message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 64))
                .foregroundColor(.gray)
            
            Text(title)
                .font(.title2)
                .fontWeight(.semibold)
            
            Text(message)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxHeight: .infinity)
    }
    
    // MARK: - Destinations
    @ViewBuilder
    private func expenseItemFormDestination(expenseType: ExpenseType) -> some View {
        let now = Date()
        ExpenseItemFormView(
            item: nil,
            preselectedExpenseTypeId: expenseType.id,
            preselectedYear: now.year,
            preselectedMonth: now.month
        ) { _ in
            isShowingSheet = false
        }
    }
    
    @ViewBuilder
    private func billPaymentFormDestination(billType: BillType) -> some View {
        let now = Date()
        BillPaymentFormView(
            payment: nil,
            preselectedBillTypeId: billType.id,
            preselectedAmount: billType.fixedAmount?.isEmpty != false ? nil : billType.fixedAmount,
            preselectedYear: now.year,
            preselectedMonth: now.month
        ) { _ in
            isShowingSheet = false
        }
    }
    
    // MARK: - Helper Functions
    private var sortedBillTypes: [BillType] {
        let activeBillTypes = billTypes.filter { !$0.stopped }
        return activeBillTypes.sorted { a, b in
            // On-demand bills (bill_cycle === 0) come first
            if a.billCycle == 0 && b.billCycle != 0 { return true }
            if a.billCycle != 0 && b.billCycle == 0 { return false }
            if a.billCycle == 0 && b.billCycle == 0 {
                return a.name.localizedCompare(b.name) == .orderedAscending
            }
            
            // For recurring bills, calculate next due date
            let now = Date()
            let calendar = Calendar.current
            let currentDay = calendar.component(.day, from: now)
            
            let aNextDue = getNextDueDate(billDay: a.billDay, currentDay: currentDay)
            let bNextDue = getNextDueDate(billDay: b.billDay, currentDay: currentDay)
            
            return aNextDue < bNextDue
        }
    }
    
    private func getNextDueDate(billDay: Int, currentDay: Int) -> Date {
        let calendar = Calendar.current
        let now = Date()
        var components = calendar.dateComponents([.year, .month], from: now)
        
        if currentDay > billDay {
            // Next month
            if let month = components.month {
                components.month = month + 1
                if components.month! > 12 {
                    components.month = 1
                    components.year! += 1
                }
            }
        }
        
        components.day = billDay
        return calendar.date(from: components) ?? now
    }
    
    private func billSubtitle(_ billType: BillType) -> String {
        if billType.billCycle == 0 {
            return "On-Demand"
        } else if billType.fixedAmount?.isEmpty == false {
            return "Day \(billType.billDay) • \(CurrencyFormatter.format(billType.fixedAmount!))"
        } else {
            return "Day \(billType.billDay)"
        }
    }
    
    private func loadData() {
        isLoading = true
        errorMessage = nil
        
        // Load both expense types and bill types
        expenseTypeViewModel.loadExpenseTypes()
        billTypeViewModel.loadBillTypes()
        
        // Wait a bit for the data to load
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.expenseTypes = expenseTypeViewModel.expenseTypes
            self.billTypes = billTypeViewModel.billTypes
            
            if let error = expenseTypeViewModel.errorMessage ?? billTypeViewModel.errorMessage {
                self.errorMessage = error
            }
            
            self.isLoading = false
        }
    }
}

// MARK: - Quick Add Type Card
struct QuickAddTypeCard: View {
    let icon: String
    let color: String
    let name: String
    let subtitle: String?
    
    var body: some View {
        VStack(spacing: 8) {
            // Icon
            Text(icon)
                .font(.system(size: 36))
                .frame(width: 60, height: 60)
                .background(Color(hex: color).opacity(0.2))
                .cornerRadius(12)
            
            // Name
            Text(name)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.primary)
                .lineLimit(2)
                .multilineTextAlignment(.center)
                .frame(height: 32)
            
            // Subtitle
            if let subtitle = subtitle {
                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(.gray)
                    .lineLimit(1)
            }
        }
        .frame(width: 100)
        .padding(.vertical, 8)
    }
}

struct QuickAddButton_Previews: PreviewProvider {
    static var previews: some View {
        QuickAddButton()
    }
}
