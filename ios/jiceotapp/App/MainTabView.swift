//
//  MainTabView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selectedTab) {
                DashboardView()
                    .tabItem {
                        Label("Dashboard", systemImage: "house.fill")
                    }
                    .tag(0)
                
                BillsMainView()
                    .tabItem {
                        Label("Bills", systemImage: "creditcard.fill")
                    }
                    .tag(1)
                
                // Empty placeholder for center quick add button
                Color.clear
                    .tabItem {
                        Label("", systemImage: "")
                    }
                    .tag(2)
                
                ExpensesMainView()
                    .tabItem {
                        Label("Expenses", systemImage: "receipt.fill")
                    }
                    .tag(3)
                
                ReportsView()
                    .tabItem {
                        Label("Reports", systemImage: "chart.bar.fill")
                    }
                    .tag(4)
            }
            .accentColor(Color("AccentColor"))
            
            // Quick Add Button overlay
            QuickAddButton()
                .padding(.bottom, 0)
        }
        .onChange(of: selectedTab) { newValue in
            // Prevent selecting the middle tab (quick add placeholder)
            if newValue == 2 {
                selectedTab = 0
            }
        }
    }
}

struct MainTabView_Previews: PreviewProvider {
    static var previews: some View {
        MainTabView()
            .environmentObject(AuthViewModel())
    }
}
