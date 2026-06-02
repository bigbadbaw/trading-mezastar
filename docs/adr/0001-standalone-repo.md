# ADR-0001: Standalone repository, separate from pokemon-mezastar

- **Status:** Accepted
- **Date:** 2026-06-02
- **Deciders:** Anthony

## Context

A Mezastar trade-fairness tool was scoped while an existing project, `pokemon-mezastar`
(tag scanner / inventory / battle advisor PWA), was already underway. The two share the
underlying tag dataset. The question was whether to build the trade tool inside the existing
repo or as its own.

## Decision

Build the trade-fairness tool as a **new standalone repository** under the `bigbadbaw` GitHub
account. Share the tag dataset between projects as data (e.g. published JSON), not as a shared
codebase.

## Alternatives considered

- **Add to the pokemon-mezastar repo** — rejected. Different audience (two-party trade
  negotiation, kids), different hosting/auth posture (this tool needs Supabase auth and is
  shared with other users), and different concerns from the scanner PWA. Coupling them would
  tangle two distinct apps and complicate deploys.

## Consequences

- Positive: clean separation of concerns; independent deploy and dependency surface; the trade
  tool can adopt Supabase/auth without affecting the scanner.
- Negative / risks: the tag dataset must be deliberately shared/synced between repos rather
  than imported directly.
- Follow-ups: decide the dataset-sharing mechanism (published JSON artifact vs. copy-at-build).
