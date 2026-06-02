# ADR-0003: Official tag images permitted only under genuine invite-gating

- **Status:** Accepted
- **Date:** 2026-06-02
- **Deciders:** Anthony

## Context

A user-friendly UI wants a picture for each tag (tap-a-picture selection, esp. for kids/
non-readers). Official Mezastar tag images depict Pokémon owned by The Pokémon Company /
Nintendo / Creatures / GAME FREAK, with the arcade product by T-ARTS and MARV (SEGA in Taiwan).
A set of official tag images has been downloaded. The community prototype deliberately shipped
NO official artwork (users upload their own photos) as a legal shield.

Copyright exposure scales with distribution, audience size, and commercial nature. A public,
multi-user, login-gated app redistributing official artwork is materially more exposed than a
small private/family tool.

## Decision

Use the official tag images, **contingent on the site staying genuinely invite-gated** —
login required, with invite/approval to join (NOT open public signup). Operational safeguards:

- Store images in a **storage bucket, not in git history**, so they can be purged instantly.
- Keep a prominent **takedown commitment** in `DISCLAIMER.md`.
- No monetization while images are in use.

## Alternatives considered

- **User-uploaded photos only** (prototype model) — safest; rejected as the default for UX
  reasons but remains the fallback if gating can't be guaranteed.
- **AI-generate the images** — rejected. Still derivative of trademarked characters; adds cost
  and quality issues; not a loophole.
- **Scrape marketplace (eBay/Shopee) photos** — rejected. Adds a second layer of IP (the
  photographer's) plus ToS violations; strictly worse.

## Consequences

- Positive: friendly image-rich UX now, with low practical risk given a closed small audience.
- Negative / risks: the legal posture depends entirely on the gate being real. Open signup
  effectively makes it public and reopens the issue.
- **Revisit triggers:** any move to public access, a paid tier, or significant audience growth.
