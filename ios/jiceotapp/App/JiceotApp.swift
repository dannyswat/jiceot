//
//  JiceotApp.swift
//  JiceotApp
//
//  Created on 12/11/2025.
//

import SwiftUI

@main
struct JiceotApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authViewModel)
        }
    }
}
