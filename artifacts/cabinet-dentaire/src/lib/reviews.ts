import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminReviewInput, Review, ReviewSubmission, Testimonial } from '@workspace/api-client-react';
import { useCabinetSession } from '@/components/auth-provider';
import { cmsRequest } from './supabase';

export const publicReviewsKey = ['cabinet', 'reviews'] as const;
export const adminReviewsKey = ['cabinet', 'admin-reviews'] as const;

function normalizeReviewText(value: string) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');
}

export function combinePublicReviews(reviews: readonly Review[], historicTestimonials: readonly Testimonial[]): Testimonial[] {
  const seen = new Set<string>();
  return [...reviews, ...historicTestimonials].filter((review) => {
    if (/démonstration|fictif|fictive|à remplacer|exemple de contenu/i.test(`${review.name} ${review.quote} ${review.service}`)) return false;
    const key = `${normalizeReviewText(review.name)}\u0000${normalizeReviewText(review.quote)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function usePublicReviews() {
  return useQuery({
    queryKey: publicReviewsKey,
    queryFn: () => cmsRequest<Review[]>('/reviews', {}, false),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useAdminReviews(enabled: boolean) {
  const { session, loading } = useCabinetSession();
  const query = useQuery({
    queryKey: [...adminReviewsKey, session?.user.id ?? 'anonymous'],
    queryFn: () => cmsRequest<Review[]>('/admin/reviews'),
    enabled: !loading && !!session && enabled,
    retry: false,
    staleTime: 0,
  });
  return { ...query, isLoading: loading || (!!session && enabled && query.isLoading) };
}

export function useSubmitReview() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (review: ReviewSubmission) =>
      cmsRequest<Review>('/reviews', { method: 'POST', body: JSON.stringify(review) }, false),
    onSuccess: (review) => {
      client.setQueryData<Review[]>(publicReviewsKey, (current = []) =>
        [review, ...current.filter((item) => item.id !== review.id)].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      );
      void client.invalidateQueries({ queryKey: publicReviewsKey });
    },
  });
}

export function useCreateAdminReview() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (review: AdminReviewInput) =>
      cmsRequest<Review>('/admin/reviews', { method: 'POST', body: JSON.stringify(review) }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: adminReviewsKey });
      void client.invalidateQueries({ queryKey: publicReviewsKey });
    },
  });
}

export function useDeleteAdminReview() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      cmsRequest<void>(`/admin/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: adminReviewsKey });
      void client.invalidateQueries({ queryKey: publicReviewsKey });
    },
  });
}
