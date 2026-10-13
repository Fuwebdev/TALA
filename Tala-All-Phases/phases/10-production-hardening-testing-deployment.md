# Phase 10 — Production Hardening, Testing & Deployment

## Goal
Prepare Tala for real student usage with strong security, performance, reliability, and maintainability.

## Testing layers
### Unit tests
Test domain entities, validation, use cases, and pure utilities.

### Integration tests
Test repositories, Supabase policies, weather adapters, and AI adapters.

### End-to-end tests
Test:
- Sign up/sign in
- Alias onboarding
- Create post
- Browse by location
- Report content
- Moderator resolution
- Admin maintenance mode
- Offline draft synchronization

## Security checklist
- Enforce RLS.
- Keep service-role credentials server-side.
- Validate all user input.
- Rate-limit sensitive endpoints.
- Protect admin routes server-side.
- Sanitize rendered content.
- Configure secure headers.
- Minimize stored personal data.
- Review third-party provider permissions.
- Maintain audit logs for privileged actions.

## Performance
- Code split large features.
- Lazy-load MapLibre.
- Optimize images.
- Use pagination/cursors.
- Cache weather.
- Avoid N+1 database queries.
- Monitor client errors and API latency.

## Deployment
Suggested setup:
```text
GitHub
  ↓ CI/CD
Frontend → Netlify/Vercel
Backend/Edge Functions → managed runtime
Database/Auth/Storage → Supabase
External APIs → Weather/AI providers
```

## Environment variables
Maintain separate development, staging, and production values. Never commit secrets.

## Release process
1. Pull request.
2. Type check.
3. Lint.
4. Unit tests.
5. Build.
6. Integration/e2e checks.
7. Security review for changed permissions.
8. Deploy staging.
9. Smoke test.
10. Production release.
11. Monitor.

## Acceptance criteria
- CI passes before production deployment.
- Critical flows have automated tests.
- RLS/security rules are tested.
- Error monitoring is enabled.
- Backups/recovery procedures are documented.
- Rollback procedure is known.
