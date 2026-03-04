# Omni Official Store

## Current State
- Header shows the store logo (`omni-logo-official.png`) but it's small (h-10) and not prominent
- Banner carousel exists and works but banners may not be loading properly (static fallback images referenced)
- Game cards show logos at `w-12 h-12` — too small to notice at a glance
- Footer is minimal: just store name, year, and caffeine.ai credit — no contact info or social links

## Requested Changes (Diff)

### Add
- Contact/support section in the footer: phone number and support label
- Social media icon row in footer: YouTube, Facebook, Instagram, WhatsApp — each clickable (placeholder links for now, user can update later)
- Bigger, more prominent game logos on homepage cards (positioned center or large overlay)

### Modify
- Header logo: increase size significantly so it's instantly noticeable — use the uploaded store logo (`/assets/uploads/WhatsApp-Image-2026-03-04-at-7.59.05-PM-1.jpeg`) as the logo image, display at h-14 or taller
- Game card logos: increase from `w-12 h-12` to `w-20 h-20` or larger, keep rounded with border, center-bottom or center overlay position for maximum visibility
- Footer: extend to include contact number row and social media icons row below existing content

### Remove
- Nothing removed

## Implementation Plan
1. Update `Header.tsx`: change logo `src` to `/assets/uploads/WhatsApp-Image-2026-03-04-at-7.59.05-PM-1.jpeg`, increase height to `h-14` and ensure it scales well on mobile too
2. Update `HomePage.tsx`: increase game logo size to `w-20 h-20` (or `w-24 h-24` on desktop), reposition to be more visually prominent on card
3. Update `Footer.tsx`: add contact/support section with phone number placeholder, add social media icons row (YouTube, Facebook, Instagram, WhatsApp) with real icon SVGs or lucide icons
4. Ensure banner carousel section renders correctly (it already exists in code and uses static fallback images)
