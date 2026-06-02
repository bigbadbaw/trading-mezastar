# Seed Data — Provenance & Field Reference

This directory holds the **raw seed dataset** for the tag catalog, extracted faithfully from the
original community prototype. It is the input to `scripts/migrate-prototype.ts`, which produces
the clean per-pack JSON in `src/data/packs/` (with domain-term field names, derived `species` and
`mechanics`, and a `migration-report.json`).

> The migration script — not this file — owns the rename and derivations. This is the untouched
> source it consumes.

## Where it came from

Extracted from **Rachel Hsieh's** Mezastar collection-manager prototype (a single-file HTML app,
MIT-licensed code, ©2026 Rachel Hsieh). Field names and values below are reproduced **as-is** from
her `defaultPacks` array — no renaming, no cleanup — so the migration script is the single place
transformations happen.

The original prototype HTML is **intentionally not committed** to this repo: it embeds official
image references and bakes in market-price guesses, which conflicts with the no-official-art-in-git
posture (ADR-0003). This extracted JSON is the faithful, clean reference.

## Contents

`seed-tags.raw.json` — array of 6 packs, **374 tags total**.

| Pack | Name (EN) | Tags extracted | Official total | Note |
|---|---|---:|---:|---|
| `g1` | Galaxy 1 | 73 | 73 | ✅ complete & officially confirmed |
| `s4` | Stardust 4 | 76 | 76 | complete; some unconfirmed fields |
| `s3` | Stardust 3 | 76 | 76 | complete; some unconfirmed fields |
| `s2` | Stardust 2 | 73 | 73 | complete; some unconfirmed fields |
| `s1` | Stardust 1 | 73 | 73 | complete; some unconfirmed fields |
| `sp` | Special Event | **3** | 50 | ⚠️ **STUB** — only 3 of ~50 event tags logged |

## Raw per-tag shape (prototype field names — to be renamed by the migration script)

```jsonc
{
  "num": "2-1-001",          // collection number — natural primary key
  "name": "轟擂金剛猩",        // → nameZh
  "enName": "Rillaboom",     // → nameEn
  "emoji": "🦍",
  "types": ["grass"],        // 1–2 types
  "star": 6,                 // → grade (1–6)
  "atk": 170,                // → energy
  "rarity": "gold-star",     // → gradeTier (enum, kept)
  "label": "★6 超明星｜可超極巨化",  // → labelZh
  "price": [500, 1000],      // → priceLow / priceHigh (NT$; Shopee-derived guesses)
  "note": "…",               // kept raw; source for mechanics derivation; NOT scored at runtime
  "unconfirmed": false       // → confirmed = !unconfirmed
}
```

## gradeTier enum (9 values, as found)

`super-rare`, `classic`, `gold-star`, `featured`, `normal-5`, `normal-4`, `normal-3`,
`normal-2`, `special`

## Known issues the migration script must handle

1. **`sp` pack is a 3-tag stub** (official total 50). Don't treat 374 as a complete catalog. The
   missing ~47 Special Event tags are a data-collection task, tracked in the Notion *Data
   Verification Tracker*.
2. **15 tags are `unconfirmed: true`** (mostly ATK/energy values flagged "待確認/待校對"). Carry a
   `confirmed` boolean; UI should badge unconfirmed tags. Only `g1` is fully confirmed.
3. **24 irregular `num` formats** — validate the `P-S-NNN` pattern but DO NOT reject:
   - `R-2-1, R-2-2, R-2-3, R-1-1, R-1-2, R-1-3` — "R" reprint cards (star 1, rarity `featured`)
   - `K-4-1, K-4-2, K-4-3, K-3-1, K-3-2, K-3-3` — "K" series
   - `EV-LUC, EV-DRG, EV-MMQ` — Special Event tags (non-numeric IDs)
   Pass these through with an `irregular` flag in the migration report; `num` stays the key.
4. **`species` is not present** — derive from `enName` (strip forme/Tera/regional/Gmax suffixes).
   Hard for dual-tags and regional forms (e.g. `Hisuian Zoroark`, `Toxtricity (Amped)`,
   `White Kyurem`, `Calyrex Ice Rider`). Emit ambiguous cases to `migration-report.json` for
   human review; unmatched → neutral default popularity (fallback-chain rule).
5. **`note` / `label` are Traditional Chinese free text** and were the prototype's scoring inputs
   (it grepped for 傳說/極巨化/超極巨化/Mega/Z/稀有位/Paradox). Derive structured `mechanics` flags
   once here; keep `note` raw for reference but never score it at runtime.
6. **`price` values are guesses** (Shopee-referenced) and many sit on unconfirmed packs. Market is
   only a small anchor in the scoring model — consider carrying a price-provenance/confirmed flag
   so a noisy guess on an unverified tag doesn't quietly skew even the small market dimension.

## Credit

Original dataset, prototype, and trade-fairness concept by **Rachel Hsieh**.
