# Phase 8 — Admin Dashboard & Operations

## Goal
Build an operational console for moderation, users, locations, analytics, and platform settings.

## Dashboard modules
- Overview
- Moderation queue
- Reports
- Users/aliases
- Posts
- Comments
- Locations
- Environmental trends
- Weather health
- AI activity
- Audit logs
- System settings

## Roles
Recommended starting roles:
- Super Admin
- Moderator
- Analyst

Use least privilege. Do not give every staff account full database access.

## Metrics
- Active users
- New posts
- Reports pending
- Moderation resolution time
- Posts by region
- Environment-related posts
- Weather API health
- AI flag volume
- Error rate

## Audit logs
Record:
- actor
- action
- target type/id
- timestamp
- outcome
- metadata needed for investigation

Never log passwords, tokens, or unnecessary personal information.

## Maintenance mode
Provide a system setting that can temporarily restrict public posting or put the entire application into read-only/maintenance mode. Exempt authorized administrators only when appropriate.

## Acceptance criteria
- Role-based navigation works.
- Moderation actions are auditable.
- Critical settings require confirmation.
- Admin dashboard is responsive.
- Sensitive operations require server-side authorization.
