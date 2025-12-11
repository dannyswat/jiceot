# Jiceot Mobile App Implementation Guide

## Overview

This document outlines the implementation steps for building native mobile applications for Jiceot (iOS and Android) that mirror the web interface functionality while providing native mobile experiences.

---

## Technology Stack

### iOS
- **Language**: Swift 5.9+
- **Framework**: SwiftUI
- **Minimum Version**: iOS 15.0+
- **Architecture**: MVVM with Combine
- **Networking**: URLSession with async/await
- **Storage**: UserDefaults, Keychain (tokens), CoreData (offline cache)
- **Authentication**: JWT with biometric authentication

### Android
- **Language**: Kotlin 1.9+
- **Framework**: Jetpack Compose
- **Minimum Version**: Android 8.0 (API 26)+
- **Architecture**: MVVM with Kotlin Flow
- **Networking**: Retrofit with Kotlin Coroutines
- **Storage**: SharedPreferences, Encrypted SharedPreferences, Room (offline cache)
- **Authentication**: JWT with biometric authentication

---

## Project Structure

### iOS (SwiftUI)
```
JiceotApp/
├── JiceotApp/
│   ├── App/
│   │   ├── JiceotApp.swift          # App entry point
│   │   └── AppDelegate.swift        # App lifecycle
│   ├── Models/
│   │   ├── User.swift
│   │   ├── BillType.swift
│   │   ├── BillPayment.swift
│   │   ├── ExpenseType.swift
│   │   ├── ExpenseItem.swift
│   │   ├── Dashboard.swift
│   │   └── Reports.swift
│   ├── ViewModels/
│   │   ├── AuthViewModel.swift
│   │   ├── DashboardViewModel.swift
│   │   ├── BillTypeViewModel.swift
│   │   ├── BillPaymentViewModel.swift
│   │   ├── ExpenseTypeViewModel.swift
│   │   ├── ExpenseItemViewModel.swift
│   │   └── ReportsViewModel.swift
│   ├── Views/
│   │   ├── Auth/
│   │   │   ├── LoginView.swift
│   │   │   ├── RegisterView.swift
│   │   │   └── ChangePasswordView.swift
│   │   ├── Dashboard/
│   │   │   ├── DashboardView.swift
│   │   │   └── DueBillsView.swift
│   │   ├── BillTypes/
│   │   │   ├── BillTypesListView.swift
│   │   │   └── BillTypeFormView.swift
│   │   ├── BillPayments/
│   │   │   ├── BillPaymentsListView.swift
│   │   │   └── BillPaymentFormView.swift
│   │   ├── ExpenseTypes/
│   │   │   ├── ExpenseTypesListView.swift
│   │   │   └── ExpenseTypeFormView.swift
│   │   ├── ExpenseItems/
│   │   │   ├── ExpenseItemsListView.swift
│   │   │   └── ExpenseItemFormView.swift
│   │   ├── Reports/
│   │   │   └── ReportsView.swift
│   │   ├── Settings/
│   │   │   ├── SettingsView.swift
│   │   │   └── NotificationSettingsView.swift
│   │   └── Components/
│   │       ├── MonthPicker.swift
│   │       ├── YearPicker.swift
│   │       ├── QuickAddButton.swift
│   │       ├── StatCard.swift
│   │       └── LoadingView.swift
│   ├── Services/
│   │   ├── APIService.swift
│   │   ├── AuthService.swift
│   │   ├── KeychainService.swift
│   │   └── NotificationService.swift
│   ├── Utilities/
│   │   ├── Constants.swift
│   │   ├── Extensions/
│   │   └── Helpers/
│   └── Resources/
│       ├── Assets.xcassets
│       └── Info.plist
└── JiceotAppTests/
```

### Android (Jetpack Compose)
```
jiceot-android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/jiceot/
│   │   │   │   ├── JiceotApplication.kt
│   │   │   │   ├── data/
│   │   │   │   │   ├── model/
│   │   │   │   │   │   ├── User.kt
│   │   │   │   │   │   ├── BillType.kt
│   │   │   │   │   │   ├── BillPayment.kt
│   │   │   │   │   │   ├── ExpenseType.kt
│   │   │   │   │   │   ├── ExpenseItem.kt
│   │   │   │   │   │   ├── Dashboard.kt
│   │   │   │   │   │   └── Reports.kt
│   │   │   │   │   ├── repository/
│   │   │   │   │   │   ├── AuthRepository.kt
│   │   │   │   │   │   ├── BillTypeRepository.kt
│   │   │   │   │   │   ├── BillPaymentRepository.kt
│   │   │   │   │   │   ├── ExpenseTypeRepository.kt
│   │   │   │   │   │   ├── ExpenseItemRepository.kt
│   │   │   │   │   │   ├── DashboardRepository.kt
│   │   │   │   │   │   └── ReportsRepository.kt
│   │   │   │   │   ├── remote/
│   │   │   │   │   │   ├── ApiService.kt
│   │   │   │   │   │   └── AuthInterceptor.kt
│   │   │   │   │   └── local/
│   │   │   │   │       ├── PreferencesManager.kt
│   │   │   │   │       └── AppDatabase.kt
│   │   │   │   ├── ui/
│   │   │   │   │   ├── MainActivity.kt
│   │   │   │   │   ├── navigation/
│   │   │   │   │   │   └── NavGraph.kt
│   │   │   │   │   ├── theme/
│   │   │   │   │   │   ├── Color.kt
│   │   │   │   │   │   ├── Theme.kt
│   │   │   │   │   │   └── Type.kt
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── LoginScreen.kt
│   │   │   │   │   │   ├── RegisterScreen.kt
│   │   │   │   │   │   └── AuthViewModel.kt
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   ├── DashboardScreen.kt
│   │   │   │   │   │   ├── DueBillsScreen.kt
│   │   │   │   │   │   └── DashboardViewModel.kt
│   │   │   │   │   ├── billtypes/
│   │   │   │   │   │   ├── BillTypesScreen.kt
│   │   │   │   │   │   ├── BillTypeFormScreen.kt
│   │   │   │   │   │   └── BillTypeViewModel.kt
│   │   │   │   │   ├── billpayments/
│   │   │   │   │   │   ├── BillPaymentsScreen.kt
│   │   │   │   │   │   ├── BillPaymentFormScreen.kt
│   │   │   │   │   │   └── BillPaymentViewModel.kt
│   │   │   │   │   ├── expensetypes/
│   │   │   │   │   │   ├── ExpenseTypesScreen.kt
│   │   │   │   │   │   ├── ExpenseTypeFormScreen.kt
│   │   │   │   │   │   └── ExpenseTypeViewModel.kt
│   │   │   │   │   ├── expenseitems/
│   │   │   │   │   │   ├── ExpenseItemsScreen.kt
│   │   │   │   │   │   ├── ExpenseItemFormScreen.kt
│   │   │   │   │   │   └── ExpenseItemViewModel.kt
│   │   │   │   │   ├── reports/
│   │   │   │   │   │   ├── ReportsScreen.kt
│   │   │   │   │   │   └── ReportsViewModel.kt
│   │   │   │   │   ├── settings/
│   │   │   │   │   │   ├── SettingsScreen.kt
│   │   │   │   │   │   └── SettingsViewModel.kt
│   │   │   │   │   └── components/
│   │   │   │   │       ├── MonthPicker.kt
│   │   │   │   │       ├── YearPicker.kt
│   │   │   │   │       ├── QuickAddButton.kt
│   │   │   │   │       ├── StatCard.kt
│   │   │   │   │       └── LoadingIndicator.kt
│   │   │   │   └── utils/
│   │   │   │       ├── Constants.kt
│   │   │   │       ├── Extensions.kt
│   │   │   │       └── DateUtils.kt
│   │   │   ├── res/
│   │   │   │   ├── values/
│   │   │   │   │   ├── colors.xml
│   │   │   │   │   ├── strings.xml
│   │   │   │   │   └── themes.xml
│   │   │   │   └── drawable/
│   │   │   └── AndroidManifest.xml
│   │   └── test/
│   └── build.gradle.kts
└── build.gradle.kts
```

---

## Implementation Phases

### Phase 1: Project Setup & Authentication (Week 1-2)

#### iOS Tasks
1. **Project Initialization**
   - [ ] Create new Xcode project with SwiftUI
   - [ ] Set up Git repository and .gitignore
   - [ ] Configure build schemes (Debug, Release)
   - [ ] Set up dependency management (Swift Package Manager)

2. **Core Services**
   - [ ] Implement `APIService` for network calls
   - [ ] Create `KeychainService` for secure token storage
   - [ ] Set up `AuthService` for JWT handling
   - [ ] Implement network error handling

3. **Authentication Screens**
   - [ ] Build `LoginView` with email/password fields
   - [ ] Build `RegisterView` with validation
   - [ ] Implement `AuthViewModel` with Combine
   - [ ] Add biometric authentication (Face ID/Touch ID)
   - [ ] Handle token refresh logic

4. **Navigation**
   - [ ] Set up main navigation structure
   - [ ] Implement TabView for main navigation
   - [ ] Create custom navigation bar

#### Android Tasks
1. **Project Initialization**
   - [ ] Create new Android Studio project with Compose
   - [ ] Set up Git repository and .gitignore
   - [ ] Configure build variants (Debug, Release)
   - [ ] Add dependencies (Retrofit, Room, Hilt, etc.)

2. **Core Services**
   - [ ] Implement `ApiService` with Retrofit
   - [ ] Create `AuthInterceptor` for token injection
   - [ ] Set up `PreferencesManager` for encrypted storage
   - [ ] Implement network error handling

3. **Authentication Screens**
   - [ ] Build `LoginScreen` composable
   - [ ] Build `RegisterScreen` composable
   - [ ] Implement `AuthViewModel` with Flow
   - [ ] Add biometric authentication (Fingerprint/Face)
   - [ ] Handle token refresh logic

4. **Navigation**
   - [ ] Set up Navigation Compose
   - [ ] Create `NavGraph` with routes
   - [ ] Implement bottom navigation bar

---

### Phase 2: Dashboard & Core Features (Week 3-4)

#### iOS Tasks
1. **Dashboard**
   - [ ] Create `DashboardView` layout
   - [ ] Implement `StatCard` component
   - [ ] Build on-demand bills section
   - [ ] Build upcoming bills section
   - [ ] Add pull-to-refresh
   - [ ] Implement `DashboardViewModel`

2. **Due Bills**
   - [ ] Create `DueBillsView` with filters
   - [ ] Implement year/month pickers
   - [ ] Add bill status indicators (overdue, due, not due)
   - [ ] Quick payment action

3. **Shared Components**
   - [ ] `MonthPicker` component
   - [ ] `YearPicker` component
   - [ ] `LoadingView` component
   - [ ] Custom color picker
   - [ ] Icon picker (emoji/SF Symbols)

#### Android Tasks
1. **Dashboard**
   - [ ] Create `DashboardScreen` composable
   - [ ] Implement `StatCard` composable
   - [ ] Build on-demand bills section
   - [ ] Build upcoming bills section
   - [ ] Add SwipeRefresh
   - [ ] Implement `DashboardViewModel`

2. **Due Bills**
   - [ ] Create `DueBillsScreen` with filters
   - [ ] Implement year/month pickers
   - [ ] Add bill status chips
   - [ ] Quick payment action

3. **Shared Components**
   - [ ] `MonthPicker` composable
   - [ ] `YearPicker` composable
   - [ ] `LoadingIndicator` composable
   - [ ] Custom color picker dialog
   - [ ] Icon picker (emoji picker)

---

### Phase 3: Bill Management (Week 5-6)

#### iOS Tasks
1. **Bill Types**
   - [ ] Create `BillTypesListView` with search
   - [ ] Build `BillTypeFormView` (create/edit)
   - [ ] Add form validation
   - [ ] Implement color picker
   - [ ] Implement icon picker
   - [ ] Add bill cycle selector
   - [ ] Toggle stopped status
   - [ ] Delete confirmation alert

2. **Bill Payments**
   - [ ] Create `BillPaymentsListView` with filters
   - [ ] Build `BillPaymentFormView`
   - [ ] Link expense items
   - [ ] Calculate monthly totals
   - [ ] Filter by bill type, year, month

#### Android Tasks
1. **Bill Types**
   - [ ] Create `BillTypesScreen` with search
   - [ ] Build `BillTypeFormScreen`
   - [ ] Add form validation
   - [ ] Implement color picker dialog
   - [ ] Implement emoji/icon picker
   - [ ] Add bill cycle selector
   - [ ] Toggle stopped status
   - [ ] Delete confirmation dialog

2. **Bill Payments**
   - [ ] Create `BillPaymentsScreen` with filters
   - [ ] Build `BillPaymentFormScreen`
   - [ ] Link expense items
   - [ ] Calculate monthly totals
   - [ ] Filter chips (bill type, year, month)

---

### Phase 4: Expense Management (Week 7-8)

#### iOS Tasks
1. **Expense Types**
   - [ ] Create `ExpenseTypesListView`
   - [ ] Build `ExpenseTypeFormView`
   - [ ] Color and icon pickers
   - [ ] Delete with confirmation
   - [ ] Batch create interface

2. **Expense Items**
   - [ ] Create `ExpenseItemsListView` with filters
   - [ ] Build `ExpenseItemFormView`
   - [ ] Link to bill types/payments
   - [ ] Filter by expense type, year, month
   - [ ] Add "unbilled only" filter
   - [ ] Calculate totals

#### Android Tasks
1. **Expense Types**
   - [ ] Create `ExpenseTypesScreen`
   - [ ] Build `ExpenseTypeFormScreen`
   - [ ] Color and icon pickers
   - [ ] Delete confirmation
   - [ ] Batch create interface

2. **Expense Items**
   - [ ] Create `ExpenseItemsScreen` with filters
   - [ ] Build `ExpenseItemFormScreen`
   - [ ] Link to bill types/payments
   - [ ] Filter chips
   - [ ] Add "unbilled only" toggle
   - [ ] Calculate totals with sticky header

---

### Phase 5: Reports & Settings (Week 9-10)

#### iOS Tasks
1. **Reports**
   - [ ] Create `ReportsView` with tabs
   - [ ] Monthly report view with charts
   - [ ] Yearly report view with summary
   - [ ] Pie chart for expense breakdown
   - [ ] Bar chart for monthly comparison
   - [ ] Export to CSV

2. **Settings**
   - [ ] Create `SettingsView` with sections
   - [ ] Profile editing
   - [ ] Change password
   - [ ] Notification settings
   - [ ] Bark integration settings
   - [ ] Account deletion
   - [ ] App version info
   - [ ] Logout

#### Android Tasks
1. **Reports**
   - [ ] Create `ReportsScreen` with tabs
   - [ ] Monthly report composable
   - [ ] Yearly report composable
   - [ ] Use MPAndroidChart or Canvas for charts
   - [ ] Pie chart for breakdowns
   - [ ] Bar chart for comparisons
   - [ ] Export to CSV

2. **Settings**
   - [ ] Create `SettingsScreen` with sections
   - [ ] Profile editing
   - [ ] Change password
   - [ ] Notification settings
   - [ ] Bark integration settings
   - [ ] Account deletion dialog
   - [ ] App version info
   - [ ] Logout

---

### Phase 6: Quick Add & Advanced Features (Week 11-12)

#### iOS Tasks
1. **Quick Add**
   - [ ] Create floating action button
   - [ ] Build quick add sheet/modal
   - [ ] Tab interface (Expenses/Bills)
   - [ ] Grid layout for types
   - [ ] Sort bills (on-demand → overdue → upcoming)
   - [ ] Navigate to form with pre-filled data

2. **Advanced Features**
   - [ ] Implement local caching (CoreData)
   - [ ] Offline mode support
   - [ ] Background sync
   - [ ] Push notifications setup
   - [ ] Deep linking
   - [ ] Widget support (Today widget)
   - [ ] Siri shortcuts
   - [ ] Share sheet integration

#### Android Tasks
1. **Quick Add**
   - [ ] Create floating action button (FAB)
   - [ ] Build bottom sheet for quick add
   - [ ] Tab layout (Expenses/Bills)
   - [ ] Grid layout with LazyVerticalGrid
   - [ ] Sort bills (on-demand → overdue → upcoming)
   - [ ] Navigate to form with pre-filled data

2. **Advanced Features**
   - [ ] Implement local caching (Room)
   - [ ] Offline mode support
   - [ ] WorkManager for background sync
   - [ ] FCM push notifications
   - [ ] Deep linking (App Links)
   - [ ] Home screen widgets
   - [ ] Share sheet integration

---

### Phase 7: Polish & Testing (Week 13-14)

#### iOS Tasks
1. **UI/UX Polish**
   - [ ] Add animations and transitions
   - [ ] Improve loading states
   - [ ] Add empty states
   - [ ] Error handling UI
   - [ ] Accessibility (VoiceOver)
   - [ ] Dark mode support
   - [ ] iPad optimization

2. **Testing**
   - [ ] Unit tests for ViewModels
   - [ ] Unit tests for Services
   - [ ] UI tests for critical flows
   - [ ] Performance testing
   - [ ] Memory leak detection

3. **Deployment Prep**
   - [ ] App icons (all sizes)
   - [ ] Launch screens
   - [ ] App Store screenshots
   - [ ] App Store description
   - [ ] Privacy policy
   - [ ] TestFlight beta testing

#### Android Tasks
1. **UI/UX Polish**
   - [ ] Add animations (Compose animations)
   - [ ] Improve loading states
   - [ ] Add empty states
   - [ ] Error handling UI
   - [ ] Accessibility (TalkBack)
   - [ ] Dark theme support
   - [ ] Tablet optimization

2. **Testing**
   - [ ] Unit tests for ViewModels
   - [ ] Unit tests for Repositories
   - [ ] UI tests with Compose Testing
   - [ ] Performance testing
   - [ ] Memory profiling

3. **Deployment Prep**
   - [ ] App icon (adaptive icon)
   - [ ] Splash screen
   - [ ] Play Store screenshots
   - [ ] Play Store description
   - [ ] Privacy policy
   - [ ] Internal testing track

---

## API Integration

Both iOS and Android apps will use the same RESTful API endpoints:

### Base URL
```
Production: https://api.jiceot.com
Development: http://localhost:8080
```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `PUT /api/auth/password` - Change password

#### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/due-bills?year={year}&month={month}` - Due bills

#### Bill Types
- `GET /api/bill-types` - List bill types
- `POST /api/bill-types` - Create bill type
- `GET /api/bill-types/{id}` - Get bill type
- `PUT /api/bill-types/{id}` - Update bill type
- `DELETE /api/bill-types/{id}` - Delete bill type
- `POST /api/bill-types/{id}/toggle` - Toggle active status

#### Bill Payments
- `GET /api/bill-payments` - List bill payments
- `POST /api/bill-payments` - Create bill payment
- `GET /api/bill-payments/{id}` - Get bill payment
- `PUT /api/bill-payments/{id}` - Update bill payment
- `DELETE /api/bill-payments/{id}` - Delete bill payment

#### Expense Types
- `GET /api/expense-types` - List expense types
- `POST /api/expense-types` - Create expense type
- `GET /api/expense-types/{id}` - Get expense type
- `PUT /api/expense-types/{id}` - Update expense type
- `DELETE /api/expense-types/{id}` - Delete expense type

#### Expense Items
- `GET /api/expense-items` - List expense items
- `POST /api/expense-items` - Create expense item
- `GET /api/expense-items/{id}` - Get expense item
- `PUT /api/expense-items/{id}` - Update expense item
- `DELETE /api/expense-items/{id}` - Delete expense item

#### Reports
- `GET /api/reports/monthly?year={year}&month={month}` - Monthly report
- `GET /api/reports/yearly?year={year}` - Yearly report

#### Notifications
- `GET /api/notifications/settings` - Get notification settings
- `PUT /api/notifications/settings` - Update notification settings

---

## Design Considerations

### Color Scheme
Match the web interface:
- **Primary**: Yellow (#EAB308 / yellow-500)
- **Secondary**: Indigo (#6366F1)
- **Success**: Green (#10B981)
- **Warning**: Amber (#F59E0B)
- **Danger**: Red (#EF4444)
- **Text**: Gray-900 (#111827)
- **Background**: Gray-50 (#F9FAFB)

### Typography
- **iOS**: SF Pro (system font)
  - Headings: SF Pro Display
  - Body: SF Pro Text
- **Android**: Roboto (system font)
  - Headings: Roboto Medium/Bold
  - Body: Roboto Regular

### Spacing
Use 8px grid system:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

### Icons
- **iOS**: SF Symbols + Emoji
- **Android**: Material Icons + Emoji

---

## Key Features Mapping

### Dashboard
- Stats cards (Total Bills, Total Expenses, Monthly Total)
- On-demand bills list
- Upcoming bills (next 30 days)
- Pull to refresh

### Quick Add (Floating Button)
- Bottom sheet/modal with tabs
- Expenses tab: Grid of expense types
- Bills tab: Grid of bill types (sorted: on-demand → overdue → upcoming)
- Tap to navigate to form with pre-filled data

### Filters
- Year picker (dropdown/wheel)
- Month picker (dropdown/wheel)
- Type filters (chips/segments)
- Unbilled expenses toggle

### Forms
- Validation feedback
- Amount input with currency formatting
- Date pickers (year/month)
- Color picker for types
- Icon/emoji picker
- Auto-save drafts

### Lists
- Infinite scroll / pagination
- Search functionality
- Swipe actions (edit/delete)
- Sort options
- Empty states

---

## Offline Support

### iOS (CoreData)
```swift
// Cache structure
entities:
  - CachedBillType
  - CachedBillPayment
  - CachedExpenseType
  - CachedExpenseItem
  - PendingSync

// Sync strategy
- Save to local DB immediately
- Queue sync operations
- Sync when network available
- Conflict resolution: server wins
```

### Android (Room)
```kotlin
// Cache structure
@Database(entities = [
    BillType::class,
    BillPayment::class,
    ExpenseType::class,
    ExpenseItem::class,
    SyncQueue::class
])

// Sync strategy
- Save to Room immediately
- Queue sync with WorkManager
- Sync when network available
- Conflict resolution: server wins
```

---

## Push Notifications

### iOS (APNs)
1. Register device token with backend
2. Backend sends notifications via APNs
3. Handle notifications:
   - Bill due reminders
   - Payment confirmations
   - Budget alerts

### Android (FCM)
1. Register FCM token with backend
2. Backend sends notifications via FCM
3. Handle notifications:
   - Bill due reminders
   - Payment confirmations
   - Budget alerts

---

## Security Best Practices

### Token Management
- Store JWT in Keychain (iOS) / EncryptedSharedPreferences (Android)
- Implement token refresh before expiration
- Clear tokens on logout
- Handle 401 errors with re-authentication

### Data Security
- Encrypt sensitive data at rest
- Use HTTPS for all API calls
- Implement certificate pinning (production)
- Enable biometric authentication
- Auto-lock after inactivity

### Input Validation
- Validate all user inputs client-side
- Sanitize data before sending to API
- Implement rate limiting for API calls

---

## Testing Strategy

### Unit Tests
- ViewModels/Repositories (80% coverage)
- Business logic
- Data transformations
- API service mocks

### Integration Tests
- API integration
- Database operations
- Navigation flows

### UI Tests
- Critical user flows
- Authentication flow
- Quick add flow
- Form submissions

### Manual Testing
- Devices: iPhone 12+, Android 8.0+
- Orientations: Portrait, Landscape
- Network conditions: Online, Offline, Slow
- Edge cases: Empty states, errors

---

## Performance Optimization

### iOS
- Use `LazyVStack` for large lists
- Image caching
- Debounce search inputs
- Background queue for heavy operations
- Minimize view re-renders

### Android
- Use `LazyColumn` for large lists
- Coil for image loading
- Debounce search with Flow operators
- Coroutines for async operations
- Remember state to avoid recomposition

---

## Deployment Checklist

### iOS (App Store)
- [ ] App Store Connect account
- [ ] Developer Program membership ($99/year)
- [ ] Provisioning profiles configured
- [ ] App icons (1024x1024)
- [ ] Screenshots (all device sizes)
- [ ] Privacy policy URL
- [ ] App description
- [ ] Keywords for ASO
- [ ] TestFlight beta testing
- [ ] Submit for review

### Android (Google Play)
- [ ] Google Play Console account ($25 one-time)
- [ ] Signing key generated
- [ ] App icons (512x512)
- [ ] Screenshots (phone, tablet)
- [ ] Feature graphic
- [ ] Privacy policy URL
- [ ] App description
- [ ] Keywords for ASO
- [ ] Internal testing track
- [ ] Submit for review

---

## Future Enhancements

### Version 2.0
- [ ] Budget tracking
- [ ] Goal setting
- [ ] Recurring expense predictions
- [ ] Receipt OCR scanning
- [ ] Bank account integration (Plaid)
- [ ] Multiple currencies
- [ ] Family/team sharing
- [ ] Export reports (PDF)

### Version 3.0
- [ ] Apple Watch / Wear OS app
- [ ] Siri shortcuts / Google Assistant
- [ ] Advanced analytics
- [ ] AI-powered insights
- [ ] Subscription optimization suggestions
- [ ] Bill negotiation reminders

---

## Resources

### iOS
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Combine Framework](https://developer.apple.com/documentation/combine)
- [URLSession](https://developer.apple.com/documentation/foundation/urlsession)
- [Keychain Services](https://developer.apple.com/documentation/security/keychain_services)
- [SF Symbols](https://developer.apple.com/sf-symbols/)

### Android
- [Jetpack Compose](https://developer.android.com/jetpack/compose)
- [Kotlin Flow](https://kotlinlang.org/docs/flow.html)
- [Retrofit](https://square.github.io/retrofit/)
- [Room Database](https://developer.android.com/training/data-storage/room)
- [Material Design 3](https://m3.material.io/)

### Design
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design Guidelines](https://material.io/design)
- [Figma](https://www.figma.com/) - Design mockups

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Auth | 2 weeks | Login, Register, Token Management |
| Phase 2: Dashboard | 2 weeks | Dashboard, Due Bills, Core Components |
| Phase 3: Bill Management | 2 weeks | Bill Types, Bill Payments |
| Phase 4: Expense Management | 2 weeks | Expense Types, Expense Items |
| Phase 5: Reports & Settings | 2 weeks | Reports, Settings, Notifications |
| Phase 6: Advanced Features | 2 weeks | Quick Add, Offline, Push Notifications |
| Phase 7: Polish & Testing | 2 weeks | Testing, Deployment Prep |
| **Total** | **14 weeks** | **Production-ready mobile apps** |

---

## Conclusion

This implementation guide provides a comprehensive roadmap for building native iOS and Android apps for Jiceot. Both apps will mirror the web interface functionality while providing native mobile experiences with offline support, push notifications, and platform-specific features.

The phased approach ensures steady progress with clear milestones, allowing for iterative development and testing. Following this guide will result in production-ready mobile applications in approximately 14 weeks of development time.

---

**Document Version**: 1.0  
**Last Updated**: December 11, 2025  
**Next Review**: After Phase 1 completion
