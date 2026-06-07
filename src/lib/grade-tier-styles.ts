/**
 * Gem-tier presentation styles keyed by `gradeTier`.
 *
 * Full Tailwind class strings (never interpolated) so the content scanner keeps
 * them. Glow is suppressed for un-owned / desaturated tags via `withGlow`.
 */

import type { GradeTier } from '@/lib/scoring/types';

export interface GradeTierStyle {
  borderClass: string;
  fillClass: string;
  badgeClass: string;
  /** Tailwind glow class; empty when glow should be suppressed. */
  glow: string;
}

/** Static lookup — Rachel gem-tier STYLING only; labels stay in gradeTier i18n. */
export const GRADE_TIER_STYLES: Record<GradeTier, GradeTierStyle> = {
  'super-rare': {
    borderClass: 'border-grade-super-rare',
    fillClass: 'bg-vault-panel',
    badgeClass: 'bg-grade-super-rare/90 text-white',
    glow: 'animate-legendaryGlow',
  },
  classic: {
    borderClass: 'border-grade-classic',
    fillClass: 'bg-vault-panel',
    badgeClass: 'bg-grade-classic/90 text-vault-bg',
    glow: 'shadow-grade-glow [--grade-glow-color:rgba(184,134,11,0.45)]',
  },
  'gold-star': {
    borderClass: 'border-grade-gold-star',
    fillClass: 'bg-vault-panel',
    badgeClass: 'bg-grade-gold-star/90 text-vault-bg',
    glow: 'shadow-grade-glow [--grade-glow-color:rgba(232,201,106,0.5)]',
  },
  featured: {
    borderClass: 'border-grade-featured',
    fillClass: 'bg-vault-panel',
    badgeClass: 'bg-grade-featured/90 text-white',
    glow: 'shadow-grade-glow [--grade-glow-color:rgba(244,114,182,0.4)]',
  },
  'normal-5': {
    borderClass: 'border-grade-normal-5',
    fillClass: 'bg-vault-panel',
    badgeClass: 'bg-grade-normal-5/90 text-vault-bg',
    glow: 'shadow-grade-glow [--grade-glow-color:rgba(226,232,240,0.25)]',
  },
  'normal-4': {
    borderClass: 'border-grade-normal-4',
    fillClass: 'bg-vault-panel',
    badgeClass: 'bg-grade-normal-4/90 text-white',
    glow: 'shadow-grade-glow [--grade-glow-color:rgba(59,130,246,0.35)]',
  },
  'normal-3': {
    borderClass: 'border-grade-normal-3',
    fillClass: 'bg-vault-panel',
    badgeClass: 'bg-grade-normal-3/90 text-vault-bg',
    glow: 'shadow-grade-glow [--grade-glow-color:rgba(34,197,94,0.35)]',
  },
  'normal-2': {
    borderClass: 'border-grade-normal-2',
    fillClass: 'bg-vault-panel',
    badgeClass: 'bg-grade-normal-2/90 text-vault-bg',
    glow: '',
  },
  special: {
    borderClass: 'border-grade-special',
    fillClass: 'bg-vault-panel',
    badgeClass: 'bg-grade-special/90 text-white',
    glow: 'shadow-grade-glow [--grade-glow-color:rgba(239,68,68,0.4)]',
  },
};

/** Resolve tier styles; pass `withGlow: false` for un-owned / desaturated tags. */
export function gradeTierStyle(tier: GradeTier, withGlow = true): GradeTierStyle {
  const base = GRADE_TIER_STYLES[tier];
  if (withGlow) return base;
  return { ...base, glow: '' };
}

/** Desaturation applied to catalog tags the user does not own. */
export const UNOWNED_DESATURATE_CLASS = 'opacity-55 grayscale';
