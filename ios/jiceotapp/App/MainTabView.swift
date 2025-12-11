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
            
            ExpensesMainView()
                .tabItem {
                    Label("Expenses", systemImage: "receipt.fill")
                }
                .tag(2)
            
            ReportsView()
                .tabItem {
                    Label("Reports", systemImage: "chart.bar.fill")
                }
                .tag(3)
            
            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .tag(4)
        }
        .accentColor(Color("AccentColor"))
    }
}

struct MainTabView_Previews: PreviewProvider {
    static var previews: some View {
        MainTabView()
            .environmentObject(AuthViewModel())
    }
}
