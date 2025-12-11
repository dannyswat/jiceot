//
//  DashboardView.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI

struct DashboardView: View {
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    Text("Dashboard")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("TODO: Implement Dashboard")
                        .foregroundColor(.gray)
                }
                .padding()
            }
            .navigationBarHidden(true)
        }
    }
}

struct DashboardView_Previews: PreviewProvider {
    static var previews: some View {
        DashboardView()
    }
}
