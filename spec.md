# Omni Official Store

## Current State

- Full-stack ICP app: Motoko backend + React/TypeScript frontend
- Games: MLBB and HOK diamond top-up
- Wallet system (balance stored in backend as Nat, displayed as IDR)
- Redeem code system: admin generates codes with INR amount, users redeem on Wallet page to credit wallet
- Admin panel with: Packages, Orders, Wallet credit, Redeem Codes tabs
- Currency currently formatted as IDR (Indonesian Rupiah)

## Requested Changes (Diff)

### Add

1. **INR currency** - Switch all currency formatting from IDR (Indonesian Rupiah) to INR (Indian Rupee, ₹)
2. **Buy Redeem Code flow** - New "Buy Code" section on the Wallet page where customers:
   - Select how much wallet credit they want to buy (e.g. ₹100, ₹200, ₹500, ₹1000, custom amount)
   - See the total to pay
   - Choose payment method: UPI Transfer or Bank Transfer
   - See payment instructions (UPI ID + QR placeholder, or bank account details)
   - After paying, they submit a payment reference/UTR number
   - A wallet top-up request is created on the backend (pending admin approval)
3. **Wallet Top-up Request system** - Backend stores top-up requests (user, amount, payment method, UTR reference, status: pending/approved/rejected)
4. **Admin Top-up Requests tab** - New tab in admin panel to view and approve/reject pending top-up requests; on approval, wallet is credited automatically
5. **Payment instructions config** - Admin can set UPI ID and bank account details from the admin panel (stored in backend)

### Modify

- `WalletPage` - Add "Add Funds" / "Buy Redeem Code" section showing payment options
- `AdminPage` - Add new "Top-up Requests" tab; update currency labels to INR
- All currency formatters - Switch from IDR to INR
- Backend - Add top-up request types, payment config storage, and related functions

### Remove

- The static "Contact admin to top up" info card on Wallet page (replaced by the new self-service flow)

## Implementation Plan

1. Update Motoko backend:
   - Add `PaymentConfig` type (upiId, bankDetails) with get/set admin functions
   - Add `TopUpRequest` type (id, user, amount, paymentMethod, utrRef, status, createdAt)
   - Add `createTopUpRequest(amount, paymentMethod, utrRef)` for users
   - Add `getAllTopUpRequests()` for admin
   - Add `approveTopUpRequest(id)` - credits wallet and marks approved
   - Add `rejectTopUpRequest(id)` - marks rejected
   - Add `getPaymentConfig()` - public query
   - Add `setPaymentConfig(upiId, bankDetails)` - admin only

2. Update frontend:
   - Switch all `currency: "IDR"` to `currency: "INR"` in formatters
   - Add `useQueries` hooks for new backend functions
   - Update `WalletPage` - add "Add Funds" section with amount selection, payment method choice (UPI/Bank), payment instructions, UTR input, submit
   - Update `AdminPage` - add "Top-up Requests" tab with approve/reject actions; add "Payment Config" section to Wallet tab
