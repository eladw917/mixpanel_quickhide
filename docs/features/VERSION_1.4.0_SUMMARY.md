# Version 1.4.0 Summary

**Release Date:** August 16, 2026
**Type:** Minor Feature Release
**Focus:** Timeline activity filtering and grouped-event identity

---

## Overview

Version 1.4.0 lets you apply Mixpanel’s native “exclude all but” filter from the Timeline tab, and treats grouped activity rows (count badge + submenu) as the same event type.

---

## New Features

- **Show only selected** — writes `includedEvents` into the profile URL from Timeline checkboxes
- **Show all events** — removes `includedEvents` / `excludedEvents` from the URL
- Include and exclude filters are mutually exclusive

## Fixes

- Grouped events with a count badge share one event name
- Opening a grouped timeline item expands the submenu, then the event
- Mixpanel hash encoding for spaces (`*20`) and special characters
- Lexicon display names map to raw names (`App Session` → `$ae_session`)
- Default `dateRange` is preserved/added so Mixpanel applies the include filter

---

## Package

**Filename:** `dist/mixpanel-activity-navigator-v1.4.0.zip`

```bash
./build.sh
git tag v1.4.0
```
