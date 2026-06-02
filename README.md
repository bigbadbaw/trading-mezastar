# Pokémon Mezastar Trade-Fairness Tool

A fan-made tool that helps two people check whether a proposed **Mezastar tag** trade is fair.
Each person picks the tags they'd give; the tool sums a transparent point value for each side
and flags whether the trade is balanced. Built to be simple enough for kids and explainable
enough for parents.

> **Not affiliated with** The Pokémon Company, Nintendo, Creatures, GAME FREAK, T-ARTS, MARV,
> or SEGA. Fan-made, non-commercial. See [`DISCLAIMER.md`](./DISCLAIMER.md).

Region scope: **Taiwan (zh-TW)** release. Stats are identical to the Japanese release.

## How the score works

Each tag gets a point value from a transparent, configurable model (`scoring-weights.ts`):

- **Rarity / scarcity** (largest) — Grade tier and promo/event status
- **Popularity** — franchise-wide, per species (a beloved-but-common species can out-value a
  rarer obscure one)
- **Market price** (small) — a sanity anchor only, not the main driver
- **Special-mechanic bonus** (small) — Gigantamax / Mega / Z-move / Legendary / Paradox

The fairness verdict compares the two batch totals against tunable tolerance bands. See
[`docs/adr/0002-scoring-model.md`](./docs/adr/0002-scoring-model.md) for the reasoning.

## Stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind · Supabase (auth + data) ·
next-intl (zh-TW / EN) · Zod · Fuse.js · Vercel.

## Status

Pre-development scaffolding. Tag data is being verified against mezastar.com (the authoritative
source) before launch — only the Galaxy 1 pack is currently fully confirmed.

## Development

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local` and fill in Supabase credentials. See `CLAUDE.md` for
working conventions and `docs/adr/` for key decisions.

## Credits

Trade-fairness concept and the original data + prototype by **Rachel Hsieh**.
