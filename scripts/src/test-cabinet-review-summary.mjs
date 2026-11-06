import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { summarizePublishedReviews } from '../../artifacts/cabinet-dentaire/src/lib/review-summary.ts';

assert.deepEqual(summarizePublishedReviews([]), { count: 0, average: null });
assert.deepEqual(summarizePublishedReviews([{ rating: 4 }, { rating: 5 }, { rating: 5 }]), { count: 3, average: 4.7 });
assert.deepEqual(summarizePublishedReviews([{ rating: 0 }, { rating: 6 }, { rating: NaN }, { rating: Infinity }, { rating: 2.5 }, { rating: '5' }]), { count: 0, average: null });
const reviews = [{ rating: 5 }, { rating: 1 }];
assert.deepEqual(summarizePublishedReviews(reviews), { count: 2, average: 3 });
assert.deepEqual(summarizePublishedReviews(reviews.slice(0, 1)), { count: 1, average: 5 });
assert.deepEqual(summarizePublishedReviews([...reviews, { rating: 3 }]), { count: 3, average: 3 });
assert.equal(reviews.length, 2);
const component = await readFile(new URL('../../artifacts/cabinet-dentaire/src/components/review-trust.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(component, /<p\b[^>]*\baria-label=/, 'Paragraphs must use accessible text, not prohibited aria-label attributes');
console.log('PASS: real means, empty data, invalid scores, additions/deletions and immutable inputs.');
