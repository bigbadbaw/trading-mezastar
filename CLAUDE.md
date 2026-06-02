# CLAUDE.md

Project context and working rules for Claude Code (and any AI assistant) in this repo.

## What this project is

A **Pokémon Mezastar trade-fairness tool**: two people each pick a batch of tags they
propose to trade; the tool sums a point value for each side and judges whether the trade
is fair. Aimed at collectors and **kids**, so the UX must be simple and the scoring must be
*transparent and explainable* (a parent should be able to see exactly why a trade is flagged).

This is a **separate, standalone project** from `pokemon-mezastar` (the scanner/inventory/
battle-advisor PWA). They share tag *data*, not a codebase. Do not assume code or conventions
from that repo unless explicitly copied in.

Region scope: **Taiwan release** (zh-TW). Stats are identical to the Japanese release.

## Terminology rules (non-negotiable)

- Say **"tag"** or **"Meza Tag"** — NEVER "card".
- Say **"Grade"** (1–6) — NEVER "rarity". Grade 5 = Star, Grade 6 = Superstar.
- **"Energy"** (寶可能量 / ポケエネ) — the power level number on a tag. NOT "level".
- **"Lanes"** — the 3 slots on the arcade machine; battles are 3v3.
- **"Get Gauge"** — the catch meter during battle.
- **"Memory Tag"** — the red progress-tracking tag (non-standard tag type).
- **"Special Tag Battle"** — co-op dual-screen mode.

Note: the seed dataset (from a community prototype) uses "card"/"star"/"rarity" internally.
When migrating that data, keep field names stable if churn is risky, but all **user-facing**
copy and all **new** code/identifiers must use the correct terminology above.

## Stack

- **Next.js 14** (App Router), **TypeScript strict mode**
- **Tailwind CSS**
- **Supabase** — auth + Postgres (per-user collections/favorites). Login is required because
  the tool is shared with other users.
- **next-intl** — i18n. zh-TW + EN from day one. All strings externalized; no hardcoded
  zh/en text in components.
- **Zod** — validate all external/data inputs and all API responses.
- **Fuse.js** — client-side fuzzy search over EN + zh-TW names.
- Deployed on **Vercel**, GitHub-connected.

## Scoring model

Point value is a **rebalanced hybrid** living in a single visible config (`scoring-weights.ts`):

- **Rarity / scarcity** — largest weight (Grade tier, promo/event status).
- **Popularity** — large, franchise-wide, **species-level** (see the Species Popularity Table
  in Notion). Captures e.g. Mewtwo > Arceus on franchise love. Joined to tags by species,
  not stamped per-tag.
- **Market price** — SMALL (≈15–20%), a sanity anchor only. Taiwan resale data is thin/noisy;
  do not let it dominate. (We deliberately did NOT go pure-market.)
- **Special-mechanic bonus** — small (Gigantamax/Mega/Z-move/Legendary/Paradox).

Every weight must stay in the config and be surfaced in the UI breakdown. Fairness verdict
uses tolerance bands (prototype baseline: <30% diff = fair; 30–100% = one side richer;
>2× = unfair) — tune in config.

## Images & legal posture

- Official tag images are used **only while the site stays genuinely invite-gated**
  (login + invite/approval, NOT open public signup).
- Store images in a **storage bucket, never in git history**, so they can be purged instantly.
- Keep the takedown commitment in `DISCLAIMER.md`.
- If the site ever goes public or adds a paid tier, the image approach must be revisited.
- Never AI-generate Pokémon imagery and never scrape marketplace photos — both add risk, not less.

See `docs/adr/0003-image-sourcing-and-gating.md`.

## Data integrity

- **mezastar.com is the authoritative source.** All tag data must be verified against it
  before shipping (see the Data Verification Tracker in Notion). Only the Galaxy 1 pack is
  currently confirmed; others carry `unconfirmed` flags to clear.
- Mezastar stats do NOT match PokeAPI. PokeAPI is acceptable for sprites/name resolution only,
  never for stats.
- Account for non-standard tag types (Memory/Special tags), not just standard Pokémon tags.

## Conventions

- **Conventional commits** (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- TypeScript strict; no `any` without a written reason.
- Validate with Zod at every boundary.
- Document consequential decisions as ADRs in `docs/adr/`.
- Prefer fallback chains over hard failures in data lookups.

## Development environment

Windows + Git Bash (MINGW64) + pnpm, consistent with the maintainer's other project.
