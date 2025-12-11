//
//  BillTypesListView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI

struct BillTypesListView: View {
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
        NavigationView {
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
            .navigationTitle("Bill Types")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingAddBillType = true
                    }) {
                        Image(systemName: "plus")
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

// MARK: - Bill Type Row
struct BillTypeRow: View {
    let billType: BillType
    
    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Text(billType.icon)
                .font(.system(size: 28))
                .frame(width: 50, height: 50)
                .background(Color(hex: billType.color).opacity(0.2))
                .cornerRadius(10)
            
            // Bill Info
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(billType.name)
                        .font(.headline)
                    
                    if billType.stopped {
                        Text("Disabled")
                            .font(.caption)
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.gray)
                            .cornerRadius(4)
                    }
                }
                
                HStack(spacing: 8) {
                    if billType.billCycle == 0 {
                        Text("On-Demand")
                            .font(.caption)
                            .foregroundColor(.gray)
                    } else {
                        Text("Day \(billType.billDay)")
                            .font(.caption)
                            .foregroundColor(.gray)
                        
                        Text("•")
                            .font(.caption)
                            .foregroundColor(.gray)
                        
                        Text(cycleText(billType.billCycle))
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
            }
            
            Spacer()
            
            // Amount
            if let amount = billType.fixedAmount, !amount.isEmpty {
                Text(amount.toCurrency())
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
            } else {
                Text("Variable")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding(.vertical, 4)
        .opacity(billType.stopped ? 0.6 : 1.0)
    }
    
    private func cycleText(_ cycle: Int) -> String {
        switch cycle {
        case 1: return "Monthly"
        case 3: return "Quarterly"
        case 6: return "Half-Yearly"
        case 12: return "Yearly"
        default: return "\(cycle) months"
        }
    }
}

struct BillTypesListView_Previews: PreviewProvider {
    static var previews: some View {
        BillTypesListView()
    }
}
