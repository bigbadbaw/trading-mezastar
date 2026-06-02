import { describe, expect, it } from 'vitest';
import { routing } from '@/i18n/routing';

// Placeholder so the test runner has a green baseline at M0.
// Real coverage lands with the scoring engine in M2.
describe('M0 scaffold', () => {
  it('configures both locales with zh-TW as default', () => {
    expect(routing.locales).toContain('zh-TW');
    expect(routing.locales).toContain('en');
    expect(routing.defaultLocale).toBe('zh-TW');
  });
});
