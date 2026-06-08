'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

/**
 * Overlay shell for the tag detail. Driven entirely by `onClose` — the catalog
 * owns the URL (`?tag=<id>`), so this component is a presentation-only dialog:
 * it layers over the still-mounted catalog and asks to close via Escape, an
 * overlay-click, or the close button. Background scroll is locked while open.
 *
 * It does NO routing itself; the catalog turns the open/closed state into a URL
 * change so the back button and shareable state keep working.
 */
export function TagDetailModal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations('catalog');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape, and lock background scroll while the overlay is open.
  // `overflow: hidden` on <body> resets the document scroll to the top, so we
  // capture the catalog's scroll position on open and restore it on close —
  // the catalog stays mounted, so this is all the scroll preservation needed.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.scrollTo(0, scrollY);
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
