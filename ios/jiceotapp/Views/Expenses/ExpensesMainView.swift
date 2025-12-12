//
//  ExpensesMainView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI

struct ExpensesMainView: View {
    @State private var selectedSegment = 0
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Segment Control
                Picker("View", selection: $selectedSegment) {
                    Text("Items").tag(0)
                    Text("Types").tag(1)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                
                // Content
                if selectedSegment == 0 {
                    ExpenseItemsContentView()
                } else {
                    ExpenseTypesContentView()
                }
            }
            .navigationTitle("Expenses")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

// MARK: - Expense Items Content
struct ExpenseItemsContentView: View {
    @StateObject private var viewModel = ExpenseItemViewModel()
    @State private var showingAddItem = false
    @State private var selectedItem: ExpenseItem?
    @State private var showingDeleteAlert = false
    @State private var itemToDelete: ExpenseItem?
    @State private var selectedYear: Int
    @State private var selectedMonth: Int
    @State private var searchText = ""
    
    init() {
        let calendar = Calendar.current
        let now = Date()
        _selectedYear = State(initialValue: calendar.component(.year, from: now))
        _selectedMonth = State(initialValue: calendar.component(.month, from: now))
    }
    
    var filteredItems: [ExpenseItem] {
        if searchText.isEmpty {
            return viewModel.expenseItems
        } else {
            return viewModel.expenseItems.filter {
                $0.expenseType?.name.localizedCaseInsensitiveContains(searchText) ?? false ||
                $0.note.localizedCaseInsensitiveContains(searchText)
            }
        }
    }
    
    var groupedItemsByType: [(type: String, icon: String, color: String, items: [ExpenseItem])] {
        let grouped = Dictionary(grouping: filteredItems) { item -> String in
            item.expenseType?.name ?? "Unknown"
        }
        
        return grouped.map { typeName, items in
            let item = items.first!
            return (
                type: typeName,
                icon: item.expenseType?.icon ?? "💰",
                color: item.expenseType?.color ?? "#6366F1",
                items: items.sorted { $0.id > $1.id }
            )
        }.sorted { $0.type < $1.type }
    }
    
    var totalAmount: Double {
        filteredItems.reduce(0) { sum, item in
            sum + (Double(item.amount) ?? 0)
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Month/Year Picker
            HStack {
                MonthYearPicker(selectedMonth: $selectedMonth, selectedYear: $selectedYear)
                
                Spacer()
                
                Button(action: {
                    showingAddItem = true
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
            
            // Expense Items List
            ZStack {
                if viewModel.isLoading && viewModel.expenseItems.isEmpty {
                    LoadingView()
                } else if viewModel.expenseItems.isEmpty {
                    emptyStateView
                } else {
                    List {
                        ForEach(groupedItemsByType, id: \.type) { group in
                            Section(header: HStack {
                                Text(group.icon)
                                Text(group.type)
                            }) {
                                ForEach(group.items) { item in
                                    ExpenseItemRow(item: item)
                                        .contentShape(Rectangle())
                                        .onTapGesture {
                                            selectedItem = item
                                        }
                                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                            Button(role: .destructive) {
                                                itemToDelete = item
                                                showingDeleteAlert = true
                                            } label: {
                                                Label("Delete", systemImage: "trash")
                                            }
                                        }
                                        .swipeActions(edge: .leading, allowsFullSwipe: false) {
                                            Button {
                                                selectedItem = item
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
                    .searchable(text: $searchText, prompt: "Search expenses")
                    .refreshable {
                        viewModel.refresh(year: selectedYear, month: selectedMonth)
                    }
                }
            }
        }
        .sheet(isPresented: $showingAddItem) {
            ExpenseItemFormView(
                item: nil,
                preselectedYear: selectedYear,
                preselectedMonth: selectedMonth
            ) { _ in
                viewModel.refresh(year: selectedYear, month: selectedMonth)
            }
        }
        .sheet(item: $selectedItem) { item in
            ExpenseItemFormView(
                item: item,
                preselectedYear: selectedYear,
                preselectedMonth: selectedMonth
            ) { _ in
                viewModel.refresh(year: selectedYear, month: selectedMonth)
            }
        }
        .alert("Delete Expense", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) {
                itemToDelete = nil
            }
            Button("Delete", role: .destructive) {
                if let item = itemToDelete {
                    viewModel.deleteExpenseItem(item)
                }
                itemToDelete = nil
            }
        } message: {
            Text("Are you sure you want to delete this expense? This action cannot be undone.")
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
            viewModel.loadExpenseItems(year: selectedYear, month: selectedMonth)
        }
        .onChange(of: selectedMonth) { _ in
            viewModel.loadExpenseItems(year: selectedYear, month: selectedMonth)
        }
        .onAppear {
            viewModel.loadExpenseItems(year: selectedYear, month: selectedMonth)
        }
    }
    
    var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "receipt")
                .font(.system(size: 64))
                .foregroundColor(.gray)
            
            Text("No Expenses")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("No expenses found for \(monthName(selectedMonth)) \(selectedYear)")
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Button(action: {
                showingAddItem = true
            }) {
                Text("Add Expense")
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

// MARK: - Expense Item Row
struct ExpenseItemRow: View {
    let item: ExpenseItem
    
    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.expenseType?.name ?? "Unknown")
                    .font(.headline)
                
                if !item.note.isEmpty {
                    Text(item.note)
                        .font(.caption)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            Text(CurrencyFormatter.format(item.amount))
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

// MARK: - Expense Types Content
struct ExpenseTypesContentView: View {
    @StateObject private var viewModel = ExpenseTypeViewModel()
    @State private var showingAddType = false
    @State private var selectedType: ExpenseType?
    @State private var showingDeleteAlert = false
    @State private var typeToDelete: ExpenseType?
    @State private var searchText = ""
    
    var filteredTypes: [ExpenseType] {
        if searchText.isEmpty {
            return viewModel.expenseTypes
        } else {
            return viewModel.expenseTypes.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                Button(action: {
                    showingAddType = true
                }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(Color("AccentColor"))
                }
            }
            .padding()
            .background(Color(.systemBackground))
            
            ZStack {
                if viewModel.isLoading && viewModel.expenseTypes.isEmpty {
                    LoadingView()
                } else if viewModel.expenseTypes.isEmpty {
                    emptyStateView
                } else {
                    List {
                        ForEach(filteredTypes) { type in
                            ExpenseTypeRow(type: type)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    selectedType = type
                                }
                                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                    Button(role: .destructive) {
                                        typeToDelete = type
                                        showingDeleteAlert = true
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                }
                                .swipeActions(edge: .leading, allowsFullSwipe: false) {
                                    Button {
                                        selectedType = type
                                    } label: {
                                        Label("Edit", systemImage: "pencil")
                                    }
                                    .tint(.blue)
                                }
                        }
                    }
                    .listStyle(InsetGroupedListStyle())
                    .searchable(text: $searchText, prompt: "Search expense types")
                    .refreshable {
                        viewModel.refresh()
                    }
                }
            }
        }
        .sheet(isPresented: $showingAddType) {
            ExpenseTypeFormView(type: nil) { _ in
                viewModel.refresh()
            }
        }
        .sheet(item: $selectedType) { type in
            ExpenseTypeFormView(type: type) { _ in
                viewModel.refresh()
            }
        }
        .alert("Delete Expense Type", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) {
                typeToDelete = nil
            }
            Button("Delete", role: .destructive) {
                if let type = typeToDelete {
                    viewModel.deleteExpenseType(type)
                }
                typeToDelete = nil
            }
        } message: {
            Text("Are you sure you want to delete this expense type? This action cannot be undone.")
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
            Image(systemName: "tag")
                .font(.system(size: 64))
                .foregroundColor(.gray)
            
            Text("No Expense Types")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Create expense types to categorize your spending")
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Button(action: {
                showingAddType = true
            }) {
                Text("Add Expense Type")
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

// MARK: - Expense Type Row
struct ExpenseTypeRow: View {
    let type: ExpenseType
    
    var body: some View {
        HStack(spacing: 12) {
            Text(type.icon)
                .font(.system(size: 28))
                .frame(width: 50, height: 50)
                .background(Color(hex: type.color).opacity(0.2))
                .cornerRadius(10)
            
            Text(type.name)
                .font(.headline)
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding(.vertical, 4)
    }
}

struct ExpensesMainView_Previews: PreviewProvider {
    static var previews: some View {
        ExpensesMainView()
    }
}
