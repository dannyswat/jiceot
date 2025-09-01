# Jiceot - Bills and Expenses Tracking Web App

## Project Overview

Jiceot is a simple, user-friendly web application designed for tracking bills and expenses. The primary goal is to provide a lazy-friendly interface that makes it easy for users to record bill payments, track outstanding bills, and view expense summaries without complex workflows.

## Target Audience

- Individuals who want to track their personal finances
- Users who prefer simple, straightforward interfaces
- People who want to categorize expenses from bills (e.g., credit card statements)
- Multi-user households or small groups

## Core Features

### 1. User Management
- **User Registration**: Simple sign-up process with email and password
- **Authentication**: Secure login/logout functionality
- **Multi-user Support**: Each user has their own isolated data
- **User Profile**: Basic profile management

### 2. Bill Management
- **Bill Type Creation**: Define recurring bill types with cycle configuration (monthly, quarterly, annual, etc.)
- **Bill Cycle Configuration**: Set specific billing day (e.g., 15th of each month) and cycle frequency for each bill type
- **Bill Payment Tracking**: Record actual payments made for each bill cycle
- **Bill Reminders**: Automatic notifications and dashboard alerts for upcoming bills based on configured cycles
- **Outstanding Bills View**: Dashboard showing all unpaid bills for current cycle periods
- **Bill Payment History**: View all previously paid bills organized by type and time period
- **Bill Categories**: Organize bill types by category (utilities, rent, credit cards, etc.)
- **Recurring Bill Management**: Enable/disable bill types and modify cycle settings

### 3. Expense Tracking
- **Expense Type Creation**: Define custom expense categories with visual customization (icon, color)
- **Expense Item Recording**: Add individual expense items with type association and optional bill payment linking
- **Bill Payment Association**: Link expense items to specific bill payments for detailed tracking
- **Expense Categories**: Organize expenses by custom types (groceries, dining, entertainment, etc.)
- **Bulk Expense Import**: Optional CSV import for credit card statements with automatic type mapping
- **Expense Notes**: Add optional descriptions to expense items
- **Monthly Expense Tracking**: Organize expense items by year and month for easy reporting

### 4. Reporting
- **Monthly Summary**: View total expenses by month with type breakdown
- **Type Breakdown**: See spending by expense type with visual indicators
- **Bill Payment Summary**: Track monthly bill payments with associated expenses
- **Export Data**: Download reports as CSV/PDF

### 5. Dashboard
- **Quick Overview**: Current month's spending, outstanding bill payments by type
- **Bill Reminders**: Prominent alerts for bills due based on configured cycles
- **Recent Activity**: Latest bill payments and expenses
- **Upcoming Bills**: Bills due soon with cycle-based calculations
- **Monthly Trends**: Simple charts showing spending patterns by bill type and category

## Technical Specifications

### Architecture
- **Frontend**: React.js with TypeScript
- **Backend**: Go (Golang) REST API
- **Database**: SQLite for data persistence
- **Deployment**: Docker containers
- **Authentication**: JWT tokens

### Technology Stack

#### Backend (Go)
- **Framework**: Echo web framework
- **Database**: SQLite with GORM ORM
- **Authentication**: JWT middleware
- **File Structure**: Vertical slice architecture
- **Testing**: Go testing framework

#### Frontend (React)
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS for modern, responsive design
- **State Management**: React Context API or Zustand
- **Routing**: React Router
- **HTTP Client**: Axios
- **UI Components**: Headless UI or Shadcn/ui

#### Infrastructure
- **Containerization**: Docker and Docker Compose
- **Database**: SQLite file storage
- **Web Server**: Nginx for production (optional)
- **Environment**: Development and production configurations

## Database Schema

### Users Table
```sql
- id (PRIMARY KEY)
- email (UNIQUE)
- password_hash
- first_name
- last_name
- created_at
- updated_at
```

### Bill Types Table
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- name
- icon
- color (hex color code)
- bill_day (day of month, 0 means no specific day)
- bill_cycle (in months, 0 means one-time)
- fixed_amount (optional fixed amount)
- stopped (BOOLEAN)
- expense_type_id (FOREIGN KEY, optional)
- created_at
- updated_at
```

### Bill Payments Table
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- bill_type_id (FOREIGN KEY)
- year (YYYY format)
- month (MM format)
- amount
- note
- created_at
- updated_at
```

### Expense Types Table
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- name
- icon
- color (hex color code)
- created_at
- updated_at
```

### Expense Items Table
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- bill_payment_id (FOREIGN KEY, optional - can be 0)
- expense_type_id (FOREIGN KEY)
- year (YYYY format)
- month (MM format)
- amount
- note
- created_at
- updated_at
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Bill Types
- `GET /api/bill-types` - List user's bill types
- `POST /api/bill-types` - Create new bill type with cycle configuration
- `GET /api/bill-types/:id` - Get specific bill type
- `PUT /api/bill-types/:id` - Update bill type (including cycle settings)
- `DELETE /api/bill-types/:id` - Delete bill type
- `POST /api/bill-types/:id/toggle` - Enable/disable bill type

### Bill Payments
- `GET /api/bill-payments` - List bill payments (with pagination and filters)
- `POST /api/bill-payments` - Record a bill payment
- `GET /api/bill-payments/:id` - Get specific bill payment
- `PUT /api/bill-payments/:id` - Update bill payment
- `DELETE /api/bill-payments/:id` - Delete bill payment
- `GET /api/bill-payments/due` - Get bills due for payment based on cycles

### Expense Types
- `GET /api/expense-types` - List user's expense types
- `POST /api/expense-types` - Create new expense type with visual customization
- `GET /api/expense-types/:id` - Get specific expense type
- `PUT /api/expense-types/:id` - Update expense type
- `DELETE /api/expense-types/:id` - Delete expense type

### Expense Items
- `GET /api/expense-items` - List expense items (with pagination and filters)
- `POST /api/expense-items` - Create new expense item
- `GET /api/expense-items/:id` - Get specific expense item
- `PUT /api/expense-items/:id` - Update expense item
- `DELETE /api/expense-items/:id` - Delete expense item
- `GET /api/expense-items/by-bill/:billPaymentId` - Get expenses for a specific bill payment

### Reports
- `GET /api/reports/monthly-summary` - Monthly expense summary
- `GET /api/reports/category-breakdown` - Expenses by type
- `GET /api/reports/bills-summary` - Bill payment summary

## User Interface Design

### Key Screens
1. **Login/Registration**: Simple forms with validation
2. **Dashboard**: Overview of bill types, due bills, and expenses with reminder alerts
3. **Bill Types List**: Manage recurring bill types with cycle configurations
4. **Add/Edit Bill Type**: Form with cycle settings (billing day, frequency) and categories
5. **Bill Payments List**: View and manage actual bill payments by type and period
6. **Record Bill Payment**: Quick form to record payment for a bill type
7. **Expense Types List**: Manage custom expense categories with visual customization
8. **Add/Edit Expense Type**: Form with icon and color selection
9. **Expense Items List**: View expense items with type and bill payment associations
10. **Add/Edit Expense Item**: Form with type selection and optional bill payment linking
11. **Reports**: Charts and tables for expense analysis by type and bill payments
12. **Settings**: User profile and preferences

### UI/UX Principles
- **Simplicity**: Minimal clicks to perform common tasks
- **Responsive**: Works well on desktop and mobile
- **Accessibility**: Proper contrast, keyboard navigation
- **Fast Input**: Quick forms with sensible defaults
- **Visual Feedback**: Clear success/error messages

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
1. **Backend Setup**
   - Initialize Go project with proper structure
   - Set up SQLite database with GORM
   - Implement user authentication (JWT)
   - Create basic API endpoints for users

2. **Frontend Setup**
   - Initialize React TypeScript project
   - Set up Tailwind CSS
   - Create basic routing structure
   - Implement authentication flow

### Phase 2: Core Features (Week 3-4)
1. **Bill Type Management**
   - CRUD operations for bill types with cycle configuration
   - Bill cycle calculation logic
   - Bill reminder system
   - Bill payment tracking

2. **Basic UI**
   - Dashboard layout with reminder alerts
   - Bill types list and configuration forms
   - Bill payment recording interface
   - Navigation and authentication UI

### Phase 3: Expense Tracking (Week 5-6)
1. **Expense Features**
   - CRUD operations for expense types with visual customization
   - Expense item tracking with bill payment associations
   - Type-based expense organization
   - Monthly expense reporting

2. **Enhanced UI**
   - Expense type management interface
   - Expense item forms with type selection and bill linking
   - Visual expense type display with icons and colors

### Phase 4: Reporting (Week 7-8)
1. **Reports Backend**
   - Monthly summary calculations
   - Category breakdown logic
   - Data aggregation endpoints

2. **Reports Frontend**
   - Charts and visualizations
   - Export functionality

### Phase 5: Polish & Deploy (Week 9-10)
1. **Testing & Bug Fixes**
   - Unit tests for critical functions
   - Integration testing
   - UI/UX improvements

2. **Deployment**
   - Docker configuration
   - Production environment setup
   - Documentation completion

## Deployment Configuration

### Docker Setup
- **Multi-stage build** for Go backend
- **Node.js build** for React frontend
- **SQLite volume** for data persistence
- **Environment variables** for configuration
- **Docker Compose** for development and production

### Environment Variables
```env
# Database
DB_PATH=/data/jiceot.db

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Server
PORT=8080
FRONTEND_URL=http://localhost:3000

# Frontend
REACT_APP_API_URL=http://localhost:8080/api
```

## Security Considerations

1. **Authentication**: Secure JWT implementation with proper expiry
2. **Data Validation**: Input validation on both frontend and backend
3. **SQL Injection**: Using GORM's prepared statements
4. **CORS**: Proper CORS configuration
5. **Rate Limiting**: Basic rate limiting for API endpoints
6. **Password Security**: Proper password hashing (bcrypt)

## Conclusion

Jiceot aims to be the simplest and most user-friendly bills and expenses tracking application. By focusing on core functionality and ease of use, it will help users maintain better financial awareness without the complexity of traditional accounting software.
