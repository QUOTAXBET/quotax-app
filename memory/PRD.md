# EdgeBet - Product Requirements Document

## Overview
EdgeBet is a sports betting prediction app covering Soccer (global leagues), NBA, and UFC. Features AI-generated predictions, bet simulator, and pre-made expert bets.

## Language
All UI copy in **Italian**.

## Design
- Dark mode: Background `#0B0F14`, Profit `#00FF88`, Premium `#FFD700`, Loss `#FF4D4D`
- FOMO elements: live viewer counts, social proof ticker
- Freemium tier gating with blurred/locked content

## Layout Structure (Hybrid)
Sport filter tabs → Match list → AI Predictions → Bet simulator modal

## Tiers
1. **Guest** - Limited preview, locked predictions
2. **Free (Registered)** - More access, some locked
3. **Premium** - Full AI predictions, schedine, live alerts

## Subscription Plans
- Base: €4.99/month
- Pro: €14.99/month  
- Premium: €29.99/month

## Tech Stack
- Frontend: React Native (Expo Router), TypeScript
- Backend: FastAPI (Python)
- Database: MongoDB
- Auth: Emergent Google OAuth

## API Endpoints
- GET /api/matches, /api/matches/{sport}
- GET /api/predictions, /api/predictions/{sport}
- POST /api/bets/simulate, POST /api/bets
- GET /api/schedine, /api/live
- GET /api/social/activity, /api/public/stats
- GET /api/subscription/plans, POST /api/subscription/subscribe
- POST /api/auth/session, GET /api/auth/me

## UI Overhaul (Completed)
- Landing Page: No-scroll, animated count-ups, win carousel, LIVE banner, CTA
- Onboarding: 3-step flow (Obiettivo, Rischio, Sport) with haptic feedback
- Pronostici: Haptic + glow on odds, Teaser vs Premium AI blocks, improved cards
- Schedine AI: Filter tabs (Tutte/Singole/Multiple), "Segui questa schedina" button
- Top Picks: Prominent Edge % banner on every card
- All animations: Haptics, glow effects, pulse CTA, progress bars

## Status
- All sports data, predictions, odds are **MOCKED** in backend
- Auth via Emergent Google OAuth (functional)
- Subscription is simulated (no real payment)
- NO fake money/wallet (uses "Followed Bets" tracking)
