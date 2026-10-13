# Phase 9 — PWA, Offline Mode & Resilience

## Goal
Make Tala useful on unstable Philippine mobile connections and during temporary outages.

## PWA features
- Installable web app
- App manifest
- Service worker
- Cached shell
- Offline fallback
- Update notification

## Offline strategy
Cache:
- App shell
- Static assets
- Recently viewed public content
- Location reference data

Queue only safe actions offline, such as draft creation. Do not pretend a post is permanently published until server synchronization succeeds.

## Sync model
```text
Offline draft
   ↓
Local queue
   ↓
Connection restored
   ↓
Validate + authenticate
   ↓
Submit
   ↓
Server acknowledgement
   ↓
Mark synced
```

## Conflict handling
Use server timestamps and explicit sync states. Avoid silently overwriting newer server content.

## Network efficiency
- Compress media.
- Lazy-load maps.
- Paginate feeds.
- Cache stable location metadata.
- Avoid repeated weather calls.

## Acceptance criteria
- App can open with a previously cached shell while offline.
- Drafts survive refresh.
- Sync state is visible.
- Failed sync can retry safely.
- No duplicate posts are created by retries.
