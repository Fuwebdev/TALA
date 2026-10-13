# Tala — Complete Phase Documentation

Tala is an anonymous, location-based student thoughts platform for the Philippines.

## Product principle

> Leave a thought where you are.

The platform lets students share thoughts using aliases rather than real names, discover posts by Philippine location, view local weather, and eventually identify environmental/community trends.

## Architecture

- Frontend: React + TypeScript + Vite
- UI: Tailwind CSS + Lucide React
- Map: MapLibre GL JS
- Backend/data: Supabase
- Weather: provider behind a `WeatherGateway`
- AI: optional provider behind application-level services
- Deployment: Netlify/Vercel-compatible frontend with managed backend services

## Privacy baseline

Never publicly expose real names, student IDs, phone numbers, email addresses, exact home coordinates, or other identifying information. Public location should normally stop at city/municipality, province, and region.

## Phases

1. Foundation & Clean Architecture
2. Supabase Database & Anonymous Identity
3. Posts, Feed, Comments & Reactions
4. Philippine Location System & Map
5. Real Weather Integration
6. Moderation, Reports & Safety
7. AI Moderation & Environmental Intelligence
8. Admin Dashboard & Operations
9. PWA, Offline Mode & Resilience
10. Production Hardening, Testing & Deployment

Each phase has a dedicated markdown specification in `phases/`.
