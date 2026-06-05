'use client';

import { useState } from 'react';

/**
 * Gated tag image with emoji fallback (M7). Points at the approval-gated route;
 * when the user isn't approved (403) or art is missing (404), the <img> errors
 * and we render the existing emoji — so the public/unapproved experience is
 * unchanged (emoji-only). The route, not this component, enforces approval.
 */
export function TagImage({
  tagId,
  emoji,
  nameEn,
  imgClassName,
  emojiClassName,
}: {
  tagId: string;
  emoji: string;
  nameEn: string;
  imgClassName?: string;
  emojiClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={emojiClassName} role="img" aria-label={nameEn}>
        {emoji}
      </span>
    );
  }

  // src is a gated 302 to a short-lived signed URL on the storage domain;
  // next/image optimization can't follow the auth redirect, and the emoji
  // fallback covers the unapproved case.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/tag-image/${encodeURIComponent(tagId)}`}
      alt={nameEn}
      loading="lazy"
      onError={() => setFailed(true)}
      className={imgClassName}
    />
  );
}
