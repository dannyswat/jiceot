# Redesign Plan

## Objectives
- To make the data structure more logically
- To optimize the user flow

## Notes
- The whole data structure will be different
- Functions are similar but more streamlined

## Redesign Idea

### Tables
- Wallet: Can be billable or cash, transfer to cash wallet will be considered a payment, related expenses can be added later
- Expense Type: Have a parent ID for grouping expense type, for reporting, allow setting fixed day periodic or flexible recurring or custom
- Payment: A transaction for drawing money from wallet
- Expense: Incurred expenses for different purposes 

### Schema

#### Wallet
- id: int, pk
- name: string
- icon: string
- description: string
- is_credit: boolean
- is_cash: boolean
- bill_period: enum: none, monthly, bimonthly, quarterly, fourmonths, semiannually, annually
- bill_due_day: int, optional
- stopped: boolean
- user_id: int
- default_expense_type_id: int, optional

#### ExpenseType
- id: int, pk
- name: string
- icon: string
- description: string
- default_amount: decimal
- default_wallet: int, optional
- recurring_type: enum: none, fixed_day, flexible
- recurring_period: enum: none, weekly, biweekly, monthly, bimonthly, quarterly, fourmonths, semiannually, annually
- recurring_due_day: int, optional
- stopped: boolean
- user_id: int
- parent_id: int, optional
- next_due_day: date

#### Payment
- id: int, pk
- wallet_id: int
- user_id: int
- amount: decimal
- date: date
- note: string

#### Expense
- id: int, pk
- expense_type_id: int
- user_id: int
- amount: decimal
- date: date
- wallet_id: int, optional
- payment_id: int, optional
- note: string

### Users' Actions
#### Add expense
Add an expense with a payment connected to a wallet
If selected wallet is cash, new expense will try to find a relevant cash payment.
#### Add expense by credit card
Add an expense linked to a wallet
#### Pay credit card
Add a payment linked selected expenses or add expense
Default expense automatically adjusted
#### Set expense reminder
Periodic billing expenses (fixed day every month/period)
Flexible recurring tasks (Get task done after a period of time, e.g. haircut, scaling)
Can postpone flexible task
#### Set credit card reminder
Check the bill period and days periodic billed wallet
#### Transfer to cash wallet
Add a payment with target wallet
Add the default expense automatically calculated
When an expense linked to the cash wallet, the default expense auto adjusted