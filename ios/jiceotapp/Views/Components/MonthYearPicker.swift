//
//  MonthYearPicker.swift
//  JiceotApp
//
//  Created on 12/12/2025.
//

import SwiftUI

struct MonthYearPicker: View {
    @Binding var selectedMonth: Int
    @Binding var selectedYear: Int
    @State private var showingPicker = false
    @State private var tempMonth: Int
    @State private var tempYear: Int
    
    private let months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    
    private let years: [Int] = {
        let current = Calendar.current.component(.year, from: Date())
        return Array((current - 5)...current).reversed()
    }()
    
    init(selectedMonth: Binding<Int>, selectedYear: Binding<Int>) {
        self._selectedMonth = selectedMonth
        self._selectedYear = selectedYear
        self._tempMonth = State(initialValue: selectedMonth.wrappedValue)
        self._tempYear = State(initialValue: selectedYear.wrappedValue)
    }
    
    var body: some View {
        Button(action: {
            tempMonth = selectedMonth
            tempYear = selectedYear
            showingPicker = true
        }) {
            HStack(spacing: 8) {
                Image(systemName: "calendar")
                    .font(.system(size: 16))
                Text("\(months[selectedMonth - 1]) \(String(selectedYear))")
                    .fontWeight(.medium)
                Image(systemName: "chevron.down")
                    .font(.caption)
            }
            .foregroundColor(.primary)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color(.systemGray6))
            .cornerRadius(10)
        }
        .sheet(isPresented: $showingPicker) {
            NavigationView {
                VStack(spacing: 0) {
                    // Picker Section
                    HStack(spacing: 0) {
                        // Month Picker
                        Picker("Month", selection: $tempMonth) {
                            ForEach(1...12, id: \.self) { month in
                                Text(months[month - 1])
                                    .tag(month)
                            }
                        }
                        .pickerStyle(WheelPickerStyle())
                        .frame(maxWidth: .infinity)
                        
                        // Year Picker
                        Picker("Year", selection: $tempYear) {
                            ForEach(years, id: \.self) { year in
                                Text(String(year))
                                    .tag(year)
                            }
                        }
                        .pickerStyle(WheelPickerStyle())
                        .frame(maxWidth: .infinity)
                    }
                    .padding()
                    
                    Spacer()
                }
                .navigationTitle("Select Month & Year")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button("Cancel") {
                            showingPicker = false
                        }
                    }
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Done") {
                            selectedMonth = tempMonth
                            selectedYear = tempYear
                            showingPicker = false
                        }
                        .fontWeight(.semibold)
                    }
                }
            }
            .presentationDetents([.height(300)])
        }
    }
}

struct MonthYearPicker_Previews: PreviewProvider {
    static var previews: some View {
        MonthYearPicker(
            selectedMonth: .constant(12),
            selectedYear: .constant(2024)
        )
        .padding()
    }
}
