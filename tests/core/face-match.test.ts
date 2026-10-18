import { describe, it, expect } from 'vitest';
import { cosine, matchFace, isValidEmbedding, EMBEDDING_LENGTH } from '@/core/face-match';

const v = (...xs: number[]) => xs;

describe('cosine', () => {
  it('is 1 for same direction, 0 for orthogonal, 0 for length mismatch', () => {
    expect(cosine(v(1, 0), v(2, 0))).toBeCloseTo(1);
    expect(cosine(v(1, 0), v(0, 1))).toBeCloseTo(0);
    expect(cosine(v(1, 0), v(1, 0, 0))).toBe(0);
  });
});

describe('matchFace', () => {
  const opts = { minScore: 0.8, minMargin: 0.1 };
  const gallery = [
    { personId: 'rohan', embedding: v(1, 0, 0) },
    { personId: 'rohan', embedding: v(0.9, 0.1, 0) },
    { personId: 'priya', embedding: v(0, 1, 0) },
  ];
  it('matches the best person above threshold with a clear margin', () => {
    expect(matchFace(v(1, 0.05, 0), gallery, opts)).toMatchObject({ status: 'match', personId: 'rohan' });
  });
  it('is unsure when below threshold', () => {
    expect(matchFace(v(0, 0, 1), gallery, opts).status).toBe('unsure');
  });
  it('is unsure when two people are too close (never guesses)', () => {
    expect(matchFace(v(1, 1, 0), gallery, { minScore: 0.5, minMargin: 0.1 }).status).toBe('unsure');
  });
  it('reports no enrolled faces', () => {
    expect(matchFace(v(1, 0, 0), [], opts).status).toBe('no_faces_enrolled');
  });
});

describe('isValidEmbedding', () => {
  it('accepts EMBEDDING_LENGTH finite numbers only', () => {
    expect(isValidEmbedding(new Array(EMBEDDING_LENGTH).fill(0.1))).toBe(true);
    expect(isValidEmbedding(new Array(10).fill(0.1))).toBe(false);
    expect(isValidEmbedding([...new Array(EMBEDDING_LENGTH - 1).fill(0), NaN])).toBe(false);
    expect(isValidEmbedding('x')).toBe(false);
  });
});
