# Phase 3 — Posts, Feed, Comments & Reactions

## Goal
Turn Tala into a functional student thought-sharing platform.

## Main entities
- `thoughts`
- `thought_media`
- `comments`
- `reactions`
- `reports`
- `saved_thoughts`

## Thought fields
Recommended fields:
- id
- author_profile_id
- alias_id
- category
- body
- location_id
- visibility
- status
- created_at
- updated_at

## Categories
- Thoughts
- School
- Life
- Community
- Environment

## Feed behavior
Support:
- Latest
- Nearby location
- Province
- Region
- Category
- Trending

Use pagination/cursor-based loading for scalability.

## Safety defaults
- New users may have posting limits.
- Rate-limit post creation.
- Block obvious spam patterns.
- Provide report controls.
- Do not expose private author metadata.

## Comments
Comments should use the same alias-based public identity model. Add pagination and moderation status.

## Reactions
Start with a small set of neutral reactions. Prevent duplicate reactions per user/post.

## Acceptance criteria
- Authenticated users can create, edit, and delete their own eligible posts.
- Feed loads published posts only.
- Location/category filters work.
- Comments and reactions respect RLS.
- Deleted or moderated content is no longer shown publicly.
