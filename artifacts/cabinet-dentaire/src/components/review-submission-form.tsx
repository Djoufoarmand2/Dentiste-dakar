import { zodResolver } from '@hookform/resolvers/zod';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { ReviewSubmission } from '@workspace/api-client-react';
import { z } from 'zod';
import { useSubmitReview } from '@/lib/reviews';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CmsError } from '@/lib/supabase';

type ReviewFormValues = Omit<ReviewSubmission, 'consent'> & { consent: boolean };

const defaultValues: ReviewFormValues = {
  name: '',
  service: '',
  quote: '',
  rating: 5,
  consent: false,
  website: '',
};

const reviewSubmissionSchema = z.object({
  name: z.string().trim().min(2, 'Saisissez au moins 2 caractères.').max(80, '80 caractères maximum.'),
  service: z.string().max(120, '120 caractères maximum.').optional(),
  quote: z.string().trim().min(12, 'Votre commentaire doit contenir au moins 12 caractères.').max(1500, '1500 caractères maximum.'),
  rating: z.number().int().min(1).max(5),
  consent: z.boolean().refine((value) => value, 'Autorisez l’affichage public de votre avis.'),
  website: z.string().max(200).optional(),
});

export function ReviewSubmissionForm() {
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSubmissionSchema),
    defaultValues,
    mode: 'onChange',
  });
  const submitReview = useSubmitReview();
  const [sent, setSent] = useState(false);
  const retryAt = submitReview.error instanceof CmsError && submitReview.error.status === 429
    ? new Date(submitReview.error.retryAt ?? Number.NaN)
    : null;
  const retryMessage = retryAt && Number.isFinite(retryAt.getTime())
    ? `Vous pourrez envoyer un nouvel avis à partir de ${new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(retryAt)}.`
    : null;

  async function submit(values: ReviewFormValues) {
    setSent(false);
    try {
      await submitReview.mutateAsync({
        ...values,
        name: values.name.trim(),
        service: values.service?.trim() || undefined,
        quote: values.quote.trim(),
        consent: true,
      });
      form.reset(defaultValues);
      setSent(true);
    } catch {
      setSent(false);
    }
  }

  return <section className="review-form-panel" aria-labelledby="review-form-title" data-testid="section-submit-review">
    <div className="review-form-heading">
      <span className="review-form-kicker">Votre expérience</span>
      <h2 id="review-form-title">Partagez votre avis</h2>
      <p>Votre avis sera publié immédiatement. Utilisez un nom d’affichage et évitez les détails médicaux personnels.</p>
    </div>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="mt-7 grid gap-5 md:grid-cols-2" data-testid="form-submit-review">
        <FormField control={form.control} name="name" rules={{ required: 'Indiquez le nom à afficher.' }} render={({ field }) => (
          <FormItem>
            <FormLabel>Nom affiché *</FormLabel>
            <FormControl><Input {...field} maxLength={80} autoComplete="name" placeholder="Ex. Amina" data-testid="input-review-name" /></FormControl>
            <FormDescription>Seul ce nom sera affiché avec votre avis.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="service" render={({ field }) => (
          <FormItem>
            <FormLabel>Soin ou visite <span className="font-normal text-muted-foreground">(facultatif)</span></FormLabel>
            <FormControl><Input {...field} value={field.value ?? ''} maxLength={120} placeholder="Ex. Consultation" data-testid="input-review-service" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="rating" render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Votre note *</FormLabel>
            <FormControl>
              <fieldset className="flex items-center gap-2" aria-label="Choisissez une note de 1 à 5">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <label key={rating} className={`cursor-pointer rounded-lg p-1.5 transition duration-200 hover:-translate-y-0.5 hover:text-[#963c48] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#b94f5b] ${rating <= field.value ? 'text-[#b94f5b]' : 'text-[#a6b4b5]'}`} data-testid={`label-review-rating-${rating}`}>
                    <input
                      className="sr-only"
                      type="radio"
                      name={field.name}
                      value={rating}
                      checked={field.value === rating}
                      onChange={() => field.onChange(rating)}
                      onBlur={field.onBlur}
                      aria-label={`${rating} sur 5`}
                      data-testid={`input-review-rating-${rating}`}
                    />
                    <Star size={26} fill={field.value >= rating ? 'currentColor' : 'none'} aria-hidden="true" />
                  </label>
                ))}
                <span className="ml-2 text-sm font-medium text-[#073e53]" aria-live="polite">{field.value}/5</span>
              </fieldset>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="quote" render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Votre commentaire *</FormLabel>
            <FormControl><Textarea {...field} rows={5} maxLength={1500} placeholder="Racontez votre expérience au cabinet…" className="min-h-32" data-testid="textarea-review-quote" /></FormControl>
            <FormDescription>{field.value.length}/1500 caractères</FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="consent" render={({ field }) => (
          <FormItem className="md:col-span-2">
            <div className="flex items-start gap-3">
              <FormControl><Checkbox checked={field.value === true} onCheckedChange={(checked) => field.onChange(checked === true)} onBlur={field.onBlur} aria-label="Autoriser la publication de mon avis" data-testid="checkbox-review-consent" /></FormControl>
              <div>
                <FormLabel className="cursor-pointer font-medium">J’autorise la publication de mon avis sur ce site. *</FormLabel>
                <FormDescription>Votre avis sera visible par tous les visiteurs et pourra être supprimé par le cabinet.</FormDescription>
                <FormMessage />
              </div>
            </div>
          </FormItem>
        )} />

        <div className="review-honeypot" aria-hidden="true">
          <label htmlFor="review-website">Ne pas remplir</label>
          <input id="review-website" type="text" tabIndex={-1} autoComplete="off" {...form.register('website')} />
        </div>

        {submitReview.isError && <p role="alert" className="review-status review-status-error md:col-span-2" data-testid="status-review-error">
          {retryMessage || submitReview.error.message || 'L’envoi n’a pas abouti. Réessayez dans quelques instants.'}
        </p>}
        {sent && <p role="status" className="review-status review-status-success md:col-span-2" data-testid="status-review-success">
          Merci pour votre retour. Votre avis est maintenant publié.
        </p>}
        <div className="md:col-span-2">
          <Button type="submit" disabled={submitReview.isPending || !form.formState.isValid} className="btn-accent min-h-12 w-full sm:w-auto" data-testid="button-submit-review">
            {submitReview.isPending ? 'Publication en cours…' : 'Publier mon avis'}
          </Button>
        </div>
      </form>
    </Form>
  </section>;
}
