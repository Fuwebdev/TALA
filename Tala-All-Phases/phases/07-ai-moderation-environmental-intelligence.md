# Phase 7 — AI Moderation & Environmental Intelligence

## Goal
Add AI as an assistive layer for safety and environmental/community trend detection, not as an unquestioned authority.

## AI capabilities
### Content assistance
- Toxicity risk classification
- Spam detection
- PII detection
- Threat-risk flagging
- Category suggestion

### Environmental intelligence
Analyze aggregated public posts for patterns such as:
- Flood observations
- Waste accumulation
- Water concerns
- Heat conditions
- Air-quality complaints
- Coastal/marine concerns
- Community cleanup activity

## Architecture
```text
Application use case
        ↓
AI moderation service
        ↓
AI provider adapter
```

## Guardrails
- AI decisions should be reviewable.
- Do not automatically punish users solely from a low-confidence model output.
- Do not send unnecessary personal information to an AI provider.
- Prefer redacted/minimized text where possible.
- Store model version and decision metadata for audits.

## Environmental analytics
Use aggregation thresholds so a dashboard cannot reveal an individual's activity. Show trends at city/province/region level only when enough observations exist.

## Provider strategy
Keep the application compatible with multiple providers through a gateway. Provider-specific SDKs stay in infrastructure.

## Acceptance criteria
- AI flags are stored separately from user content.
- Moderators can override AI decisions.
- Confidence and model metadata are available to authorized admins.
- Environmental dashboards use aggregated data.
