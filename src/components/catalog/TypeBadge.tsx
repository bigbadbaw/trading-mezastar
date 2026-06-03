import { useTranslations } from 'next-intl';

import type { PokemonType } from '@/data/schema';
import { typeBadgeClass } from '@/lib/pokemon-types';

/** A single Pokémon-type pill. Label is i18n; color is a static Tailwind class. */
export function TypeBadge({ type }: { type: PokemonType }) {
  const t = useTranslations('types');
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${typeBadgeClass(type)}`}
    >
      {t(type)}
    </span>
  );
}
