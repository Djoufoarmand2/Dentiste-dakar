import { zodResolver } from '@hookform/resolvers/zod';
import { Star, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AdminReviewInput } from '@workspace/api-client-react';
import { useAdminReviews, useCreateAdminReview, useDeleteAdminReview } from '@/lib/reviews';
import { Button } from '@/components/ui/button';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const adminReviewSchema = z.object({
  name: z.string().trim().min(2, 'Indiquez un nom affiché.').max(80, '80 caractères maximum.'),
  service: z.string().max(120, '120 caractères maximum.'),
  quote: z.string().trim().min(1, 'Ajoutez un commentaire.').max(1500, '1500 caractères maximum.'),
  rating: z.coerce.number().int().min(1).max(5),
});

type AdminReviewForm = z.infer<typeof adminReviewSchema>;
const defaultValues: AdminReviewForm = { name: '', service: '', quote: '', rating: 5 };

export function AdminReviewsPanel() {
  const reviews = useAdminReviews(true);
  const create = useCreateAdminReview();
  const remove = useDeleteAdminReview();
  const form = useForm<AdminReviewForm>({
    resolver: zodResolver(adminReviewSchema),
    defaultValues,
    mode: 'onChange',
  });

  async function submit(values: AdminReviewForm) {
    try {
      await create.mutateAsync({
        name: values.name.trim(),
        service: values.service.trim(),
        quote: values.quote.trim(),
        rating: values.rating,
      } satisfies AdminReviewInput);
      form.reset(defaultValues);
    } catch {
      // The mutation state below displays the server error.
    }
  }

  function deleteReview(id: string) {
    if (window.confirm('Supprimer définitivement cet avis ?')) remove.mutate(id);
  }

  return <div className="admin-reviews-panel space-y-7" data-testid="admin-reviews-panel">
    <section className="admin-review-create rounded-2xl border border-border bg-card p-5 md:p-7">
      <div className="mb-5">
        <p className="eyebrow">Publication administrateur</p>
        <h3 className="mt-2 font-display text-2xl text-[#073e53]">Créer un avis</h3>
        <p className="mt-2 text-sm text-muted-foreground">Il sera visible immédiatement sur le site public. Utilisez un témoignage dont la publication est autorisée.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="grid gap-4 md:grid-cols-2" data-testid="form-admin-create-review">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nom affiché</FormLabel>
              <FormControl><Input {...field} maxLength={80} data-testid="input-admin-review-name" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="service" render={({ field }) => (
            <FormItem>
              <FormLabel>Soin ou visite <span className="font-normal text-muted-foreground">(facultatif)</span></FormLabel>
              <FormControl><Input {...field} maxLength={120} data-testid="input-admin-review-service" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="rating" render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Note sur 5</FormLabel>
              <FormControl><Input {...field} type="number" min={1} max={5} data-testid="input-admin-review-rating" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="quote" render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Commentaire</FormLabel>
              <FormControl><Textarea {...field} rows={4} maxLength={1500} data-testid="textarea-admin-review-quote" /></FormControl>
              <FormDescription>{field.value.length}/1500 caractères</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          {create.isError && <p role="alert" className="text-sm text-destructive md:col-span-2" data-testid="status-admin-review-create-error">{create.error.message}</p>}
          {create.isSuccess && <p role="status" className="text-sm text-[#147e75] md:col-span-2" data-testid="status-admin-review-create-success">Avis publié.</p>}
          <div className="md:col-span-2">
            <Button type="submit" className="btn-accent min-h-11" disabled={create.isPending || !form.formState.isValid} data-testid="button-admin-create-review">
              {create.isPending ? 'Publication…' : 'Publier cet avis'}
            </Button>
          </div>
        </form>
      </Form>
    </section>

    <section aria-labelledby="admin-reviews-list-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">Avis visiteurs et cabinet</p><h3 id="admin-reviews-list-title" className="mt-2 font-display text-2xl text-[#073e53]">Avis gérés</h3><p className="mt-2 text-sm text-muted-foreground">Les avis reçus via le formulaire et ceux créés ici sont enregistrés ensemble. Les témoignages historiques restent dans la section CMS ci-dessous.</p></div>
        <p className="text-xs text-muted-foreground">{reviews.data?.length ?? 0} avis</p>
      </div>
      {reviews.isLoading && <div className="rounded-xl bg-secondary/60 p-6 text-sm text-muted-foreground" role="status">Chargement des avis…</div>}
      {reviews.isError && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive" role="alert" data-testid="status-admin-reviews-error">{reviews.error.message || 'Impossible de charger les avis.'}</div>}
      {!reviews.isLoading && !reviews.isError && !reviews.data?.length && <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground" data-testid="empty-admin-reviews">Aucun avis visiteurs pour le moment.</div>}
      {!!reviews.data?.length && <div className="grid gap-4 lg:grid-cols-2">
        {reviews.data.map((review) => <article key={review.id} className="admin-review-card rounded-xl border border-border bg-card p-5" data-testid={`admin-review-${review.id}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold text-[#073e53]">{review.name}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{review.service || 'Sans soin précisé'} · {review.source === 'visitor' ? 'Avis visiteur' : 'Créé par le cabinet'}</p>
            </div>
            <button type="button" onClick={() => deleteReview(review.id)} disabled={remove.isPending} aria-label={`Supprimer l’avis de ${review.name}`} className="admin-delete-review grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" data-testid={`button-admin-delete-review-${review.id}`}>
              <Trash2 size={17} aria-hidden="true" />
            </button>
          </div>
          <p className="my-4 text-sm leading-6 text-foreground/80">« {review.quote} »</p>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="flex items-center gap-1 text-[#147e75]" aria-label={`${review.rating} sur 5`}>
              {Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} fill={index < review.rating ? 'currentColor' : 'none'} aria-hidden="true" />)}
            </span>
            <time className="text-xs text-muted-foreground" dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString('fr-FR')}</time>
          </div>
        </article>)}
      </div>}
      {remove.isError && <p role="alert" className="mt-4 text-sm text-destructive" data-testid="status-admin-review-delete-error">{remove.error.message}</p>}
      {remove.isSuccess && <p role="status" className="mt-4 text-sm text-[#147e75]" data-testid="status-admin-review-delete-success">L’avis a été supprimé.</p>}
    </section>
  </div>;
}
