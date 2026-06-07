'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { usePathname, useRouter } from '@/i18n/navigation';
import { type Locale } from '@/i18n/routing';

/** Display order: EN first, then zh-TW (Rachel prototype top-bar). */
const LOCALE_OPTIONS: ReadonlyArray<{ locale: Locale; label: string }> = [
  { locale: 'en', label: 'EN' },
  { locale: 'zh-TW', label: '中' },
];

/**
 * Header pill toggle to swap the leading /{locale} segment while preserving
 * the current route and query string.
 */
export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function switchTo(next: Locale): void {
    if (next === locale) return;
    const query = searchParams.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    router.replace(href, { locale: next });
  }

  return (
    <div
      role="group"
      aria-label={t('switchLanguage')}
      className="inline-flex min-h-11 items-center rounded-full border border-vault-hairline bg-vault-panel/60 p-0.5"
    >
      {LOCALE_OPTIONS.map(({ locale: option, label }) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => switchTo(option)}
            className={`inline-flex min-h-10 min-w-11 items-center justify-center rounded-full px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold motion-safe:transition-colors ${
              active
                ? 'bg-vault-gold text-vault-bg'
                : 'text-vault-muted hover:text-vault-text'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
