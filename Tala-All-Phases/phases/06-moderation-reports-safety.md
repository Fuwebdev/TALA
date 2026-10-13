# Phase 6 — Moderation, Reports & Safety

## Goal
Protect students and keep Tala useful without destroying anonymous expression.

## Core entities
- `reports`
- `moderation_actions`
- `blocked_users`
- `content_flags`
- `moderation_queue`

## Report reasons
- Harassment
- Threats
- Hate or discrimination
- Sexual content
- Self-harm concern
- Spam/scam
- Personal information
- Illegal content
- Other

## Moderation states
```text
published → flagged → under_review → approved
                         └──────────→ removed
```

## User safety
- Block another alias.
- Report a thought/comment.
- Rate-limit abusive behavior.
- Provide clear community guidelines.
- Avoid exposing reporter identity to normal users.

## Admin workflow
1. Report submitted.
2. Content enters moderation queue.
3. Moderator reviews context.
4. Action is recorded.
5. User receives a safe status message when appropriate.
6. Audit log records who performed the action.

## Important privacy rule
Anonymous-to-public does not mean invisible to the platform. Internal identifiers may be required for abuse prevention, but they should not be exposed publicly.

## Acceptance criteria
- Users can report and block.
- Moderators can review and resolve reports.
- Every moderation action is auditable.
- RLS prevents ordinary users from accessing moderation internals.
