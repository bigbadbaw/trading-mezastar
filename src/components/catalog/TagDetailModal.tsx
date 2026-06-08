'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

/**
 * The overlay shell for the route-backed tag detail (Next.js intercepting +
 * parallel routes). Rendered ONLY when the detail route is reached via in-app
 * navigation, layered over the still-mounted catalog (so its filters + scroll
 * survive). Closing pops the history entry (`router.back()`), which returns to
 * the catalog URL and unmounts the overlay. A direct load / refresh of the same
 * URL bypasses this and renders the full-page route instead.
 *
 * Uses the plain next/navigation router: `back()` is locale-agnostic history
 * navigation, so no locale prefix handling is needed here.
 */
export function TagDetailModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const t = useTranslations('catalog');
  const panelRef = useRef<HTMLDivElement>(null);

  const onClose = useCallback(() => router.back(), [router]);

  // Close on Escape, and lock background scroll while the overlay is open.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
      className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-vault-bg/80 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto w-full max-w-3xl rounded-xl border border-vault-hairline bg-vault-bg p-6 shadow-2xl focus:outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('closeDetail')}
          className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-vault-hairline bg-vault-panel text-lg text-vault-text hover:border-vault-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vault-gold"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
