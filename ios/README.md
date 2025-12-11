# Jiceot iOS App

A native iOS application for managing bills and expenses, built with SwiftUI.

## Requirements

- Xcode 15.0+
- iOS 15.0+
- Swift 5.9+

## Project Structure

```
JiceotApp/
├── App/                    # App entry point and main navigation
├── Models/                 # Data models matching API responses
├── ViewModels/            # MVVM ViewModels with Combine
├── Views/                 # SwiftUI views organized by feature
│   ├── Auth/             # Login & Register
│   ├── Dashboard/        # Dashboard & Due Bills
│   ├── BillTypes/        # Bill types management
│   ├── BillPayments/     # Bill payments management
│   ├── ExpenseTypes/     # Expense types management
│   ├── ExpenseItems/     # Expense items management
│   ├── Reports/          # Monthly & yearly reports
│   ├── Settings/         # App settings
│   └── Components/       # Reusable UI components
├── Services/              # API and backend services
├── Utilities/             # Constants, extensions, helpers
└── Resources/             # Assets, Info.plist
```

## Setup Instructions

### 1. Open in Xcode

Since this is a file-based structure, you'll need to create an Xcode project:

1. Open Xcode
2. Create New Project → iOS → App
3. Product Name: `JiceotApp`
4. Interface: SwiftUI
5. Language: Swift
6. Save to: `/Users/dannys/repos/jiceot/ios/`

### 2. Add Files to Project

1. Delete the default files created by Xcode (ContentView.swift, etc.)
2. Drag the JiceotApp folder structure into your Xcode project
3. Ensure "Copy items if needed" is checked
4. Create folder references for proper organization

### 3. Configure Build Settings

1. Set Minimum iOS Version: iOS 15.0
2. Set Bundle Identifier: `com.jiceot.app`
3. Configure Signing & Capabilities

### 4. Update API Base URL

In `Utilities/Constants.swift`, update the API base URL:
- Development: `http://localhost:8080`
- Production: `https://api.jiceot.com`

### 5. Build and Run

1. Select target device/simulator
2. Press Cmd+R to build and run

## Features Implemented

### ✅ Phase 1: Authentication (Complete)
- [x] Login screen
- [x] Register screen
- [x] JWT token management via Keychain
- [x] Auth service with Combine
- [x] AuthViewModel for state management

### 🚧 Phase 2-7: To Be Implemented
- [ ] Dashboard with stats
- [ ] Bill types CRUD
- [ ] Bill payments CRUD
- [ ] Expense types CRUD
- [ ] Expense items CRUD
- [ ] Reports (monthly/yearly)
- [ ] Settings & notifications
- [ ] Quick add floating button

## Architecture

### MVVM Pattern
- **Models**: Codable structs matching API responses
- **Views**: SwiftUI views
- **ViewModels**: ObservableObject classes using Combine

### Services Layer
- **APIService**: Generic HTTP client
- **AuthService**: Authentication endpoints
- **KeychainService**: Secure token storage

### State Management
- Combine framework for reactive programming
- @Published properties for view updates
- @EnvironmentObject for shared state

## API Integration

All API calls use the backend server:
- Base URL: Configured in Constants.swift
- Authentication: Bearer token in Authorization header
- Request/Response: JSON format

### Example API Call
```swift
AuthService.shared.login(email: email, password: password)
    .sink { completion in
        // Handle completion
    } receiveValue: { response in
        // Handle success
    }
    .store(in: &cancellables)
```

## Security

- JWT tokens stored in iOS Keychain
- HTTPS required for production
- Certificate pinning (TODO)
- Biometric authentication (TODO)

## Testing

### Unit Tests
```bash
# Run tests
Cmd+U
```

### UI Tests
Located in `JiceotAppTests/` folder

## Next Steps

1. Implement Dashboard view with API integration
2. Create Bill Types list and form views
3. Add Bill Payments functionality
4. Implement Expense management
5. Build Reports with charts
6. Add Quick Add floating button
7. Implement push notifications
8. Add offline support with CoreData

## Color Scheme

Primary colors matching web interface:
- Accent Yellow: #EAB308
- Indigo: #6366F1
- Success Green: #10B981
- Warning Amber: #F59E0B
- Danger Red: #EF4444

## Resources

- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Combine Framework](https://developer.apple.com/documentation/combine)
- [MOBILE.md](../../MOBILE.md) - Complete implementation guide

## License

Private - Jiceot Project

---

**Version**: 1.0.0  
**Last Updated**: December 11, 2025
