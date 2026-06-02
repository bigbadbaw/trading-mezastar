/**
 * Letter-grade lookup for a 0..100 score (M2-spec §2e, bands kept verbatim).
 */

import { GRADE_BANDS, GRADE_META } from './weights';

export interface Grade {
  grade: string;
  /** i18n message key (not literal text). */
  label: string;
  color: string;
}

/** Map a total score to its letter grade + display metadata. */
export function gradeOf(total: number): Grade {
  for (const [min, grade] of GRADE_BANDS) {
    if (total >= min) {
      const meta = GRADE_META[grade] ?? { label: `scoring.grade.${grade}`, color: '#6b7280' };
      return { grade, label: meta.label, color: meta.color };
    }
  }
  // GRADE_BANDS ends at [0, 'F'], so this is unreachable for non-negative input.
  const fallback = GRADE_META['F'] ?? { label: 'scoring.grade.F', color: '#6b7280' };
  return { grade: 'F', label: fallback.label, color: fallback.color };
}
