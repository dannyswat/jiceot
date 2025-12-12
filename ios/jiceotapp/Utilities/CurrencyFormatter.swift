//
//  CurrencyFormatter.swift
//  JiceotApp
//
//  Created on 12/12/2025.
//

import Foundation

struct CurrencyFormatter {
    static func format(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "¤"
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: amount)) ?? "¤0.00"
    }
    
    static func format(_ amountString: String) -> String {
        guard let amount = Double(amountString) else { return "¤0.00" }
        return format(amount)
    }
}
