import { describe, expect, it } from 'vitest';

import {
  COLLECTION_STATUSES,
  CollectionItemSchema,
  CollectionStatusSchema,
} from './collection';

const validRow = {
  id: '11111111-1111-4111-8111-111111111111',
  user_id: '22222222-2222-4222-8222-222222222222',
  tag_id: 'g1-2-1-008',
  status: 'owned' as const,
  quantity: 2,
  created_at: '2026-06-04T00:00:00.000Z',
  updated_at: '2026-06-04T00:00:00.000Z',
};

describe('collection schema', () => {
  it('accepts a well-formed row', () => {
    const parsed = CollectionItemSchema.parse(validRow);
    expect(parsed.tag_id).toBe('g1-2-1-008');
    expect(parsed.quantity).toBe(2);
  });

  it('exposes exactly the three collection statuses', () => {
    expect(COLLECTION_STATUSES).toEqual(['owned', 'wanted', 'most_wanted']);
  });

  it('accepts every valid status', () => {
    for (const status of COLLECTION_STATUSES) {
      expect(CollectionStatusSchema.parse(status)).toBe(status);
    }
  });

  it('rejects an unknown status', () => {
    expect(() => CollectionItemSchema.parse({ ...validRow, status: 'maybe' })).toThrow();
  });

  it('rejects a negative quantity', () => {
    expect(() => CollectionItemSchema.parse({ ...validRow, quantity: -1 })).toThrow();
  });

  it('rejects a non-integer quantity', () => {
    expect(() => CollectionItemSchema.parse({ ...validRow, quantity: 1.5 })).toThrow();
  });

  it('rejects a non-uuid user_id', () => {
    expect(() => CollectionItemSchema.parse({ ...validRow, user_id: 'nope' })).toThrow();
  });

  it('rejects an empty tag_id', () => {
    expect(() => CollectionItemSchema.parse({ ...validRow, tag_id: '' })).toThrow();
  });

  it('allows quantity zero (an emptied owned slot)', () => {
    expect(CollectionItemSchema.parse({ ...validRow, quantity: 0 }).quantity).toBe(0);
  });
});
