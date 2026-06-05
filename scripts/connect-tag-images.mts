/**
 * Connect-script — ingest a local folder of TC tag images into the M7 private
 * bucket, keyed to catalog tagIds. DRY-RUN by default; pass --commit to upload.
 *
 * Physical tags are the Taiwan (TC) release; TC numbering maps 1:1 to the
 * catalog's JP-style `num`, and stats are identical (verified — see the Notion
 * TC-vs-JP resolution), so the catalog's `num` IS the join key after stripping a
 * cosmetic trailing " TC".
 *
 * Resolution + attach rules:
 *   1. imageNum = basename without `.png` and without a trailing " TC".
 *   2. Match imageNum against catalog records; the pack is encoded in the tagId
 *      as `${pack}-${num}` (num alone is NOT unique — reprints repeat across
 *      packs).
 *   3. exactly ONE candidate           → upload to {pack}/{num}.png
 *      MULTIPLE, all identical reprints → fan out to every {pack}/{num}.png
 *      MULTIPLE, NOT identical          → SKIP (don't guess)
 *      ZERO                             → SKIP
 *   4. Same private bucket + key convention as M7 (BUCKET, tagImageKey).
 *
 * Uploads require the service_role key: the M7 bucket has an approved-only READ
 * policy and NO write policy, so writes are admin-only by design (migration
 * 0003). This admin ingest script is the only place that key is used, and only
 * under --commit. Idempotent: upserts overwrite the same key, never duplicate.
 *
 * Run (dry-run):  pnpm tsx scripts/connect-tag-images.mts <folder>
 * Run (commit):   pnpm tsx scripts/connect-tag-images.mts <folder> --commit
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getScoredCatalog, type ScoredTag } from '../src/data/catalog';
import { BUCKET, tagImageKey } from '../src/lib/images/tag-image';

// ---------------------------------------------------------------------------
// Normalisation + resolution (pure — no network, used by the dry run)
// ---------------------------------------------------------------------------

/** Strip the `.png` extension and any cosmetic trailing " TC" / "TC". */
function normalizeNum(file: string): string {
  return basename(file)
    .replace(/\.png$/i, '')
    .replace(/\s*TC$/i, '')
    .trim();
}

/** Index every catalog record by its (non-unique) `num`. */
function indexByNum(): Map<string, ScoredTag[]> {
  const byNum = new Map<string, ScoredTag[]>();
  for (const entry of getScoredCatalog()) {
    const list = byNum.get(entry.tag.num) ?? [];
    list.push(entry);
    byNum.set(entry.tag.num, list);
  }
  return byNum;
}

/** True when every candidate is the same tag reprinted (identical stats). */
function allIdenticalReprints(candidates: ScoredTag[]): boolean {
  const first = candidates[0];
  if (!first) return false;
  return candidates.every(
    (c) =>
      c.tag.nameEn === first.tag.nameEn &&
      c.tag.grade === first.tag.grade &&
      c.tag.energy === first.tag.energy,
  );
}

type Action = 'upload' | 'fanout' | 'skip';

interface Plan {
  file: string;
  num: string;
  tagIds: string[];
  keys: string[];
  action: Action;
  reason: string;
}

/** Decide what to do with one filename, without touching the network. */
function planForFile(file: string, byNum: Map<string, ScoredTag[]>): Plan {
  const base: Omit<Plan, 'action' | 'reason' | 'tagIds' | 'keys'> = {
    file,
    num: normalizeNum(file),
  };

  if (!/\.png$/i.test(file)) {
    return { ...base, tagIds: [], keys: [], action: 'skip', reason: 'not a .png file' };
  }

  const candidates = byNum.get(base.num) ?? [];

  if (candidates.length === 0) {
    return { ...base, tagIds: [], keys: [], action: 'skip', reason: `no catalog match for num "${base.num}"` };
  }

  if (candidates.length === 1) {
    const only = candidates[0]!;
    return {
      ...base,
      tagIds: [only.tag.tagId],
      keys: [tagImageKey(only.tag.pack, only.tag.num)],
      action: 'upload',
      reason: '1 candidate',
    };
  }

  // Multiple candidates: fan out only if they are byte-identical reprints.
  if (allIdenticalReprints(candidates)) {
    return {
      ...base,
      tagIds: candidates.map((c) => c.tag.tagId),
      keys: candidates.map((c) => tagImageKey(c.tag.pack, c.tag.num)),
      action: 'fanout',
      reason: `identical reprint across ${candidates.length} packs`,
    };
  }

  const packs = candidates.map((c) => c.tag.pack).join(', ');
  return {
    ...base,
    tagIds: candidates.map((c) => c.tag.tagId),
    keys: [],
    action: 'skip',
    reason: `ambiguous: ${candidates.length} NON-identical candidates (packs: ${packs}) — refusing to guess`,
  };
}

// ---------------------------------------------------------------------------
// Admin client (only constructed under --commit)
// ---------------------------------------------------------------------------

/** No-op WebSocket so @supabase/realtime-js doesn't throw at construction on
 *  Node (we only use storage HTTP, never realtime). Mirrors scripts/rls-gate. */
class NoopWS {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  constructor(_address: string, _protocols?: string | string[]) {}
  close() {}
  send(_data: unknown) {}
}

function loadCommitEnv(): { url: string; serviceKey: string } {
  const env: Record<string, string> = {};
  if (existsSync('.env.local')) {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && m[1] && m[2] !== undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !serviceKey) {
    throw new Error(
      '--commit needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.\n' +
        'The tag-images bucket has no write policy (admin-only uploads by design, migration 0003),\n' +
        'so uploading requires the service_role key. Dry-run needs neither.',
    );
  }
  return { url, serviceKey };
}

function adminClient(url: string, serviceKey: string): SupabaseClient {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: NoopWS as unknown as typeof WebSocket },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const commit = args.includes('--commit');
  const folder = args.find((a) => !a.startsWith('--'));

  if (!folder) {
    console.error('Usage: tsx scripts/connect-tag-images.mts <folder> [--commit]');
    process.exit(2);
  }
  if (!existsSync(folder) || !statSync(folder).isDirectory()) {
    console.error(`Not a folder: ${folder}`);
    process.exit(2);
  }

  const byNum = indexByNum();
  const files = readdirSync(folder).filter((f) => statSync(join(folder, f)).isFile()).sort();
  const plans = files.map((f) => planForFile(f, byNum));

  console.log(`\n=== Tag-image connect ${commit ? '(COMMIT)' : '(DRY-RUN — no uploads)'} ===`);
  console.log(`folder: ${folder}`);
  console.log(`bucket: ${BUCKET} (private)\n`);

  let admin: SupabaseClient | null = null;
  if (commit) {
    const { url, serviceKey } = loadCommitEnv();
    admin = adminClient(url, serviceKey);
  }

  let uploaded = 0;
  let fannedKeys = 0;
  const skips: Plan[] = [];

  for (const p of plans) {
    const targets = p.tagIds.length ? p.tagIds.join(', ') : '—';
    let line = `${p.file}  →  ${p.num}  →  [${targets}]  →  `;

    if (p.action === 'skip') {
      line += `SKIP (${p.reason})`;
      skips.push(p);
      console.log(line);
      continue;
    }

    const label = p.action === 'fanout' ? `FAN-OUT ${p.keys.length}` : 'UPLOAD';
    line += `${label} → ${p.keys.join(', ')}`;
    console.log(line);

    if (commit && admin) {
      const buf = readFileSync(join(folder, p.file));
      for (const key of p.keys) {
        const { error } = await admin.storage
          .from(BUCKET)
          .upload(key, buf, { contentType: 'image/png', upsert: true });
        if (error) {
          console.log(`    ! upload failed for ${key}: ${error.message}`);
        } else {
          console.log(`    ✓ uploaded ${key}`);
        }
      }
    }

    if (p.action === 'upload') uploaded += 1;
    else fannedKeys += p.keys.length;
  }

  const fanoutFiles = plans.filter((p) => p.action === 'fanout').length;
  console.log('\n=== Summary ===');
  console.log(`files seen:        ${plans.length}`);
  console.log(`single uploads:    ${uploaded}`);
  console.log(`fan-out files:     ${fanoutFiles} (→ ${fannedKeys} keys)`);
  console.log(`skipped:           ${skips.length}`);
  for (const s of skips) console.log(`  - ${s.file}: ${s.reason}`);
  console.log(
    commit
      ? '\nCOMMIT complete. Re-running is idempotent (upsert overwrites same keys).'
      : '\nDRY-RUN only — no uploads. Re-run with --commit to upload.',
  );
}

main().catch((err: unknown) => {
  console.error('\nconnect: FAILED');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
