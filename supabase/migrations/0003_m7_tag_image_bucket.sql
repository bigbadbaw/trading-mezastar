-- M7: private tag-image bucket + approved-only read policy. Activates the M5
-- gate (profiles.approved) for official tag art per ADR-0003 — images are
-- served ONLY to authenticated + approved users, via short-lived signed URLs,
-- from a PRIVATE bucket, and never committed to git.
--
-- Applied to the Supabase project via the SQL editor / MCP; kept here for
-- version control (same as 0001 / 0002). There is no Supabase MCP in the dev
-- environment, so this file must be run against the project manually.
--
-- KEY CONVENTION: object key is `{pack}/{num}.png`, e.g. `s4/1-4-001.png`,
-- `s1/R-1-1.png`. The app derives it from the canonical tagId via the catalog
-- (getScoredTag(tagId) → pack, num); `num` alone is NOT unique (reprints like
-- R-1-1 repeat across packs s1–s4), so the bucket is keyed by pack + num.
--
-- SECURITY: NO service_role is used by the app. Signed URLs are minted on the
-- user's own session; the SELECT policy below is what guarantees only an
-- APPROVED session can mint one (defense-in-depth behind the route's
-- app-level isApproved() check). Uploads have NO policy ⇒ they are admin-only
-- (dashboard / service_role), so art is managed out-of-band.

-- Private bucket (public = false). Idempotent.
insert into storage.buckets (id, name, public)
values ('tag-images', 'tag-images', false)
on conflict (id) do nothing;

-- Approved-only read. With RLS on storage.objects (Supabase default) and only
-- this SELECT policy, an authenticated-but-unapproved user — and anon — cannot
-- read or sign objects in this bucket. No insert/update/delete policy ⇒ writes
-- are admin-only.
create policy "tag_images_read_approved" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'tag-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.approved
    )
  );
