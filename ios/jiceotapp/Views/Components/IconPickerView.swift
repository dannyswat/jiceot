//
//  IconPickerView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI

struct IconPickerView: View {
    @Environment(\.dismiss) var dismiss
    @Binding var selectedIcon: String
    
    let icons = [
        "💳", "🏠", "⚡️", "💧", "📱", "🌐", "📺", "🎵",
        "🎮", "🍔", "🚗", "⛽️", "🏥", "💊", "🏋️", "📚",
        "✏️", "🎨", "🎬", "✈️", "🏨", "🛒", "👔", "👕",
        "👟", "💄", "💍", "🎁", "🎂", "🍕", "☕️", "🍺",
        "🎓", "💼", "🏦", "💰", "📊", "📈", "🔧", "🔨",
        "🎯", "⚽️", "🏀", "🎾", "⛳️", "🎣", "🏊", "🚴"
    ]
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.adaptive(minimum: 60))
                ], spacing: 16) {
                    ForEach(icons, id: \.self) { icon in
                        Button(action: {
                            selectedIcon = icon
                            dismiss()
                        }) {
                            Text(icon)
                                .font(.system(size: 36))
                                .frame(width: 60, height: 60)
                                .background(
                                    selectedIcon == icon
                                        ? Color("AccentColor").opacity(0.2)
                                        : Color.gray.opacity(0.1)
                                )
                                .cornerRadius(10)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(
                                            selectedIcon == icon
                                                ? Color("AccentColor")
                                                : Color.clear,
                                            lineWidth: 2
                                        )
                                )
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Select Icon")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct IconPickerView_Previews: PreviewProvider {
    static var previews: some View {
        IconPickerView(selectedIcon: .constant("💳"))
    }
}
