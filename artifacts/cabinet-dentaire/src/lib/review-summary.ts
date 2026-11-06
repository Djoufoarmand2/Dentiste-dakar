type RatedReview = { rating: number };

/** Summarize already combined/deduplicated public reviews, never demo totals. */
export function summarizePublishedReviews(reviews: readonly RatedReview[]): { count: number; average: number | null } {
  const ratings = reviews.map((review) => review.rating).filter((rating) =>
    typeof rating === 'number' && Number.isFinite(rating) && Number.isInteger(rating) && rating >= 1 && rating <= 5,
  );
  return {
    count: ratings.length,
    average: ratings.length ? Math.round(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length * 10) / 10 : null,
  };
}
