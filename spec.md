# Omni Official Store

## Current State

Full-stack ICP app with a React frontend and Motoko backend.

**Backend capabilities:**
- User auth via MixinAuthorization (admin/user roles)
- Games (hardcoded 2: MLBB, HOK)
- Diamond packages (per game, CRUD by admin)
- Orders (place, status update, all orders)
- Wallet (balance, credit by admin)
- Redeem codes (generate/redeem)
- Top-up requests (UPI/bank payment, approve/reject)
- Payment config (UPI ID, bank details)

**Frontend admin panel tabs:**
- Packages (add/edit/delete per game)
- Orders (view all, update status)
- Wallet (credit wallet, payment config)
- Top-up Requests (approve/reject)
- Redeem Codes (generate, view all)

**Frontend homepage:** Static banners, static featured games (MLBB + HOK hardcoded).

## Requested Changes (Diff)

### Add

1. **Admin Dashboard / Overview tab** (new first tab in admin panel):
   - Monthly registration stats: count of new users who registered this month
   - Active customers count: total users who have placed at least one order
   - Total users registered ever
   - Summary cards for: total orders, pending orders, total revenue (sum of completed orders), total top-up requests pending

2. **Website Customization tab** in admin panel with these sections:
   - **Branding**: Change site logo URL/text, site name, tagline
   - **Banner Management**: Add/edit/remove banners (image URL, title, subtitle, CTA text, CTA link)
   - **Homepage Text**: Edit featured section heading, footer text
   - **Offer/Discount Config**: Set a global discount % or promo text shown on diamond pages
   - **Background Color / Theme**: Pick primary color, background color via color picker
   - **Games Management**: Add new games (name, description, currency name e.g. "Diamonds"), toggle in-stock / out-of-stock per game

3. **Backend: Site Config store** — new `SiteConfig` type and persistent map to save customization settings (banners, branding, game metadata including currency + stock status, discount config, theme colors).

4. **Backend: User Stats** — new queries for admin:
   - `getUserStats()`: returns total users, users registered this month, active customers (users with at least 1 order)

5. **Backend: Game management** — extend `Game` type with `currency` (Text), `inStock` (Bool) fields; add `addGame`, `updateGame`, `removeGame` admin endpoints.

6. **Frontend: Dynamic homepage** — banners and featured games pulled from backend SiteConfig instead of hardcoded arrays.

### Modify

- `Game` type: add `currency: Text` and `inStock: Bool` fields
- `DiamondPage`: show currency label (e.g. "Diamonds" or custom) from game data; show out-of-stock badge when applicable; apply discount % from SiteConfig
- `HomePage`: read banners and featured games from backend SiteConfig (with fallback to static defaults while loading)
- Admin panel: add Overview tab and Customize tab to existing tab list

### Remove

- Nothing removed

## Implementation Plan

1. Update Motoko backend:
   - Add `currency` and `inStock` to `Game` type
   - Add `SiteConfig` type (banners array, branding fields, discount config, theme colors)
   - Add `UserStats` type
   - Add `siteConfig` persistent var
   - Add `setSiteConfig`, `getSiteConfig` endpoints
   - Add `addGame`, `updateGame`, `removeGame` admin endpoints
   - Add `getUserStats` admin query (counts from userProfiles map, orders map, timestamps)
   - Seed default games (MLBB id=1, HOK id=2) with currency="Diamonds", inStock=true on first call

2. Update frontend backend.d.ts to reflect new types and endpoints

3. Add new React query hooks: `useGetSiteConfig`, `useSetSiteConfig`, `useGetUserStats`, `useAddGame`, `useUpdateGame`, `useRemoveGame`, `useGetGames`

4. Build admin Overview tab with stat cards (monthly registrations, active customers, total users, orders summary, revenue)

5. Build admin Customize tab with sub-sections: Branding, Banners, Games, Discount/Promo, Theme colors

6. Update HomePage to use dynamic banners and games from SiteConfig

7. Update DiamondPage to use game currency label, out-of-stock state, and discount from SiteConfig
