# iOS Shortcuts Integration

Track Apple Pay expenses automatically using the iPhone Shortcuts Transaction automation. When you make a payment with Apple Pay, the automation can send the transaction details to Jiceot without manual input.

## Prerequisites

1. A running Jiceot server accessible from your iPhone
2. Your automation API URL from Jiceot Settings
3. Expense types configured with **iOS Shortcut Category** values

## Step 1: Configure Expense Types

In Jiceot, edit each expense type you want to map from Apple Pay and set the **iOS Shortcut Category** field. Use values that match what you'll send from the shortcut, for example:

| iOS Shortcut Category | Expense Type |
|----------------------|--------------|
| Food & Drinks        | Dining       |
| Travel               | Travel       |
| Services             | Services     |
| Transport            | Transportation |
| Shopping             | Shopping     |
| Entertainment        | Entertainment |
| Health               | Healthcare   |

## Step 2: Get Your Automation API URL

In Jiceot:

1. Open **Settings**
2. Find the **Automation** section
3. Copy the **Automation API URL**
4. If the URL was ever exposed, use **Rotate key** and copy the new URL again

The copied URL already includes the `api_key` query parameter, so you do not need to configure authentication headers manually.

## Step 3: Create the Transaction Automation

1. Open the **Shortcuts** app on your iPhone
2. Go to the **Automation** tab
3. Tap **+** → **Create Personal Automation**
4. Select **Transaction**
5. Choose **Apple Pay**
6. Configure any filters you want in the trigger
7. Tap **Next**

### Add these actions in order:

#### a) Get transaction details

- Add **Get Details of Transaction**
- Use the Transaction provided by the automation trigger
- Extract at least these values:
  - `Amount`
  - `Date`
  - `Merchant`
  - `Category` if your device exposes it

#### b) Format the date

- Add **Format Date**
- Input: transaction date
- Format: **Custom**
- Pattern: `yyyy-MM-dd`
- Save result to variable: `FormattedDate`

#### c) Build the note

- Use the merchant name as the note, or combine merchant and card details if you want
- Save result to variable: `Note`

#### d) Build JSON body

- Add action: **Dictionary**
- Add these key-value pairs:
  - `amount` → transaction amount
  - `category` → transaction category
  - `note` → `Note`
  - `date` → `FormattedDate`
- Optionally add `wallet_id` → (Number) if you want to force a specific wallet

#### e) Send API request

- Add action: **Get Contents of URL**
- URL: paste the **Automation API URL** copied from Jiceot Settings
- Method: **POST**
- Request Body: **Dictionary** from previous step

## Fastest Setup

To simplify creating the shortcut as much as possible:

1. Copy the full **Automation API URL** from Settings instead of copying only the key.
2. In Shortcuts, keep only these core actions after the Transaction trigger:
   - **Get Details of Transaction**
   - **Dictionary**
   - **Get Contents of URL**
3. Paste the copied URL directly into **Get Contents of URL** so you do not need to add auth headers or remember parameter names.

#### f) Show result

- Add action: **Show Notification**
- Set to something like: `Expense tracked: Amount at Merchant`

## Category Availability

- Jiceot requires a `category` value that matches an expense type's **iOS Shortcut Category**.
- Apple’s public Shortcuts documentation confirms the **Transaction** automation exists, but it does not enumerate the exact fields available from the Transaction object.
- On devices where **Get Details of Transaction** exposes **Category**, this setup is fully automatic.
- If **Category** is not available on your iPhone or in your region, Shortcuts cannot provide fully automatic category mapping directly. In that case you need a fallback, such as a merchant-to-category dictionary inside the shortcut.

## API Reference

### Create Expense via Automation

```
POST /api/automation/expense?api_key=<AUTOMATION_API_KEY>
Content-Type: application/json

{
  "amount": 42.50,
  "category": "Food & Drinks",
  "wallet_id": 1,
  "note": "Lunch at cafe",
  "date": "2026-04-16"
}
```

**Parameters:**

| Field     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| amount    | number | Yes      | Expense amount (must be > 0) |
| category  | string | Yes      | Must match an expense type's iOS Shortcut Category |
| wallet_id | number | No       | Wallet ID. Falls back to the expense type's default wallet |
| note      | string | No       | Optional note for the expense |
| date      | string | No       | Date in `YYYY-MM-DD` format. Defaults to today |

**Response:** `201 Created` with the created expense JSON.

**Errors:**
- `401 Unauthorized` — Invalid or missing automation API key
- `400 Bad Request` — Missing required fields or invalid data
- `404 Not Found` — No expense type found matching the given category
