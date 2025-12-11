//
//  BillTypePickerView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI

struct BillTypePickerView: View {
    @Environment(\.dismiss) var dismiss
    let billTypes: [BillType]
    @Binding var selectedBillTypeId: Int?
    
    var body: some View {
        List {
            ForEach(billTypes) { billType in
                Button(action: {
                    selectedBillTypeId = billType.id
                    dismiss()
                }) {
                    HStack(spacing: 12) {
                        Text(billType.icon)
                            .font(.system(size: 28))
                            .frame(width: 50, height: 50)
                            .background(Color(hex: billType.color).opacity(0.2))
                            .cornerRadius(10)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(billType.name)
                                .font(.headline)
                                .foregroundColor(.primary)
                            
                            if let amount = billType.fixedAmount, !amount.isEmpty {
                                Text(amount.toCurrency())
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                        }
                        
                        Spacer()
                        
                        if selectedBillTypeId == billType.id {
                            Image(systemName: "checkmark")
                                .foregroundColor(Color("AccentColor"))
                                .fontWeight(.semibold)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("Select Bill Type")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct BillTypePickerView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            BillTypePickerView(billTypes: [], selectedBillTypeId: .constant(nil))
        }
    }
}
