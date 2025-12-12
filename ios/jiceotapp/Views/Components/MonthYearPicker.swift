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
    
    private let months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    
    private let years: [Int] = {
        let current = Calendar.current.component(.year, from: Date())
        return Array((current - 5)...current).reversed()
    }()
    
    var body: some View {
        HStack(spacing: 12) {
            // Month Picker
            Menu {
                ForEach(0..<12, id: \.self) { index in
                    Button(action: {
                        selectedMonth = index + 1
                    }) {
                        HStack {
                            Text(months[index])
                            if selectedMonth == index + 1 {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                }
            } label: {
                HStack {
                    Text(months[selectedMonth - 1])
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
            
            // Year Picker
            Menu {
                ForEach(years, id: \.self) { year in
                    Button(action: {
                        selectedYear = year
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
