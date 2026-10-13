# Phase 4 — Philippine Location System & Modern Map

## Goal
Create a reliable Philippine-only location system and map experience.

## Location hierarchy
```text
Philippines
└── Region
    └── Province
        └── City / Municipality
            └── Barangay (optional)
```

## Public location policy
Default public precision: city/municipality + province + region.

Avoid displaying exact coordinates or exact addresses.

## Map requirements
- MapLibre GL JS.
- Restrict navigation to the Philippines.
- Use a production-approved tile/style provider.
- Disable unnecessary world exploration.
- Provide zoom controls and accessible location labels.
- Show aggregated thought density rather than individual exact user points when privacy risk exists.

## Suggested bounds
Approximate Philippines bounds:
- Southwest: 116.5, 4.5
- Northeast: 127.0, 21.5

These are product bounds, not a substitute for authoritative administrative boundaries.

## Location selection
Use searchable dropdowns for region → province → city/municipality. Do not require GPS permission for basic browsing.

## Acceptance criteria
- Only Philippine locations are selectable.
- Map stays within configured Philippine bounds.
- Feed filters use normalized location IDs.
- Location names come from a maintained dataset.
- Exact user coordinates are never rendered publicly.
