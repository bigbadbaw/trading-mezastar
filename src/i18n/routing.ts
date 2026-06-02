import { defineRouting } from 'next-intl/routing';

// zh-TW is the primary locale (Taiwan release); EN is the secondary toggle.
export const routing = defineRouting({
  locales: ['zh-TW', 'en'],
  defaultLocale: 'zh-TW',
});

export type Locale = (typeof routing.locales)[number];
