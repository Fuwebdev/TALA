# Phase 1 — Foundation & Clean Architecture

## Goal
Create a stable frontend foundation where business rules do not depend on React, Supabase, MapLibre, or a specific weather provider.

## Deliverables
- React + TypeScript + Vite application
- Tailwind CSS design system
- Domain entities
- Repository interfaces
- Application use cases
- Infrastructure adapters
- Presentation components/pages
- Philippines-only map prototype
- Mock weather gateway
- Demo anonymous thought cards

## Architecture
```text
src/
├── app/
├── domain/
│   ├── entities/
│   └── repositories/
├── application/
│   └── use-cases/
├── infrastructure/
│   ├── maps/
│   ├── repositories/
│   └── weather/
├── presentation/
│   ├── components/
│   └── pages/
└── shared/
```

## Rules
- Domain must not import React, Supabase, MapLibre, or browser APIs.
- Use cases depend on domain contracts.
- Infrastructure implements contracts.
- Presentation calls use cases rather than directly embedding business logic.
- Keep API keys out of source code.

## Acceptance criteria
- App runs with `npm run dev`.
- Map renders with Philippines bounds.
- Weather card uses a mock gateway.
- Demo thoughts render without a backend.
- Components are responsive on mobile and desktop.

## Next phase
Move persistence and identity into Supabase while preserving the same domain/application boundaries.
