# Omni Official Store

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- Full-stack diamond top-up website for Mobile Legends Bang Bang (MLBB) and Honor of Kings (HOK)
- Header with logo (top-left) and nav links: Home, Account, Wallet, Order, Leaderboard (top-right, desktop)
- Mobile header: logo (left) + hamburger toggle (right); drawer contains: Home, Wallet, Order, Leaderboard, Account
- Hero banner carousel (3 banners, auto-sliding) below header
- Quick-access icon buttons for all nav items below the banner section
- Featured Games section with 2 game cards: MLBB and HOK
- Each game card links to a dedicated diamond purchase page
- Diamond purchase page: select diamond denomination, enter game User ID, place order
- Diamond package listings stored in backend (game ID, package name, amount, price)
- Order submission stored in backend (user ID, game, package, player ID, status)
- Wallet page: shows balance and top-up option
- Order history page: list of past orders
- Leaderboard page: top spenders/buyers
- Account page: profile info

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan
1. Backend: games catalog (MLBB/HOK), diamond packages per game, order submission, wallet balance, leaderboard
2. Frontend: responsive layout with header/nav, banner carousel, quick-nav icons, featured game cards
3. MLBB diamond page: package grid, player ID input, order confirmation
4. HOK diamond page: same structure as MLBB
5. Wallet, Order history, Leaderboard, Account pages
6. Mobile hamburger menu drawer
