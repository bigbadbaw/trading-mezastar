/**
 * Pure helpers for synthesizing a tag's DISPLAY LABEL from structured fields.
 *
 * The displayed label is ALWAYS synthesized per-locale (never the raw seed
 * `labelZh`): ★{grade} + a translated gradeTier term + any active mechanic
 * terms. 298 tags have an empty `labelZh` and the 76 populated ones are zh-only,
 * so `labelZh` is treated as an optional zh-only enrichment surfaced ONLY in the
 * zh-TW UI — never as the primary/bilingual label.
 *
 * These functions return i18n message KEYS (and the raw grade number); the
 * component translates them with next-intl. That keeps this module pure and
 * unit-testable without a translator.
 */

import type { Tag } from '@/data/schema';
import { MECHANIC_FLAGS, type MechanicFlag } from '@/lib/scoring/types';

export interface TagLabelParts {
  /** e.g. "★5" — grade rendered as stars, locale-independent. */
  gradeStars: string;
  /** i18n key for the gradeTier term, e.g. "gradeTier.gold-star". */
  gradeTierKey: string;
  /** i18n keys for each active special mechanic, e.g. "mechanics.gigantamax". */
  mechanicKeys: string[];
}

/** Active mechanic flags in canonical order. */
export function activeMechanics(tag: Tag): MechanicFlag[] {
  return MECHANIC_FLAGS.filter((f) => tag.mechanics[f]);
}

/** Structured pieces for the synthesized label; the component joins + translates. */
export function tagLabelParts(tag: Tag): TagLabelParts {
  return {
    gradeStars: `★${tag.grade}`,
    gradeTierKey: `gradeTier.${tag.gradeTier}`,
    mechanicKeys: activeMechanics(tag).map((f) => `mechanics.${f}`),
  };
}

/**
 * Optional zh-only enrichment line. Returns the trimmed `labelZh` only when the
 * UI locale is zh-TW and the field is non-empty; otherwise undefined.
 */
export function zhEnrichment(tag: Tag, locale: string): string | undefined {
  if (locale !== 'zh-TW') return undefined;
  const trimmed = tag.labelZh.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** True when the tag's price is unverified (priceConfidence below 1.0). */
export function isUnconfirmed(tag: Tag): boolean {
  return tag.priceConfidence < 1;
}
