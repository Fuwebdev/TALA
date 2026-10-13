# Phase 2 — Supabase Database & Anonymous Identity

## Goal
Introduce real persistence and an anonymous-by-design account model without exposing a student's real identity publicly.

## Core tables
- `profiles`
- `aliases`
- `regions`
- `provinces`
- `cities_municipalities`
- `barangays` (optional and carefully restricted)
- `user_preferences`
- `audit_logs`

## Identity model
Use Supabase Auth internally. A user account may have an internal UUID, but public posts should reference a generated alias/profile identifier instead of personal identity.

## Alias requirements
- Generated during onboarding.
- Unique within the public platform.
- Changeable under controlled rules.
- No automatic use of email, real name, student number, or phone number.
- Prevent alias enumeration where practical.

## Privacy
Store exact coordinates only if there is a legitimate product need. If stored, restrict access through RLS and never expose raw coordinates to normal clients.

## RLS principles
- Users can read public-safe profile fields.
- Users can update only their own private settings.
- Public feed access is limited to published content.
- Administrative actions require explicit role checks.
- Service-role keys stay server-side.

## Acceptance criteria
- Sign up/sign in works.
- Alias is generated and displayed publicly.
- RLS prevents cross-user private data access.
- Database migrations are versioned.
- No client bundle contains service-role secrets.
