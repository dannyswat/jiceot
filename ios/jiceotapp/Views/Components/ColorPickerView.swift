//
//  ColorPickerView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI

struct ColorPickerView: View {
    @Environment(\.dismiss) var dismiss
    @Binding var selectedColor: String
    
    let colors = [
        "#EAB308", // Yellow
        "#6366F1", // Indigo
        "#10B981", // Green
        "#F59E0B", // Amber
        "#EF4444", // Red
        "#3B82F6", // Blue
        "#8B5CF6", // Purple
        "#EC4899", // Pink
        "#06B6D4", // Cyan
        "#14B8A6", // Teal
        "#F97316", // Orange
        "#84CC16", // Lime
        "#A855F7", // Violet
        "#F43F5E", // Rose
        "#0EA5E9", // Sky
        "#22C55E", // Emerald
    ]
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVGrid(columns: [
                    GridItem(.adaptive(minimum: 80))
                ], spacing: 16) {
                    ForEach(colors, id: \.self) { color in
                        Button(action: {
                            selectedColor = color
                            dismiss()
                        }) {
                            Circle()
                                .fill(Color(hex: color))
                                .frame(width: 60, height: 60)
                                .overlay(
                                    Circle()
                                        .stroke(
                                            selectedColor == color
                                                ? Color.white
                                                : Color.clear,
                                            lineWidth: 4
                                        )
                                )
                                .overlay(
                                    Circle()
                                        .stroke(
                                            selectedColor == color
                                                ? Color(hex: color).opacity(0.5)
                                                : Color.clear,
                                            lineWidth: 8
                                        )
                                )
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Select Color")
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

struct ColorPickerView_Previews: PreviewProvider {
    static var previews: some View {
        ColorPickerView(selectedColor: .constant("#EAB308"))
    }
}
