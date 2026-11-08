import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Images, MessageSquareQuote, PlayCircle, Stethoscope } from 'lucide-react';
import type { SiteContent, Testimonial } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { combinePublicReviews, usePublicReviews } from '@/lib/reviews';
import { summarizePublishedReviews } from '@/lib/review-summary';
import { localizedPath, useSiteLocale } from '@/lib/site-locale';

const t = (locale: 'fr' | 'en', fr: string, en: string) => (locale === 'en' ? en : fr);

function prefersReducedMotion() {
  return typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window);
}

/** Becomes true once the element enters the viewport (immediately with reduced motion). */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion()) { setSeen(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setSeen(true); observer.disconnect(); }
    }, { threshold: 0.1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, seen] as const;
}

function RatingStars({ value, size = 22, countUp = false }: { value: number; size?: number; countUp?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (cls: string) => <span className={cls} style={{ fontSize: size }}>{'★★★★★'}</span>;
  return <span className="trust-stars" aria-hidden="true">
    {row('trust-stars-base')}
    <span className="trust-stars-fill" style={{ width: `${pct}%`, transition: countUp ? 'none' : undefined }}>{row('')}</span>
  </span>;
}

export function useCombinedReviewSummary(testimonials: SiteContent['testimonials']) {
  const query = usePublicReviews();
  const combined: Testimonial[] = combinePublicReviews(query.data ?? [], testimonials);
  return { query, combined, summary: summarizePublishedReviews(combined) };
}

function useRatingCountUp(target: number, active: boolean) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!active || prefersReducedMotion()) {
      setDisplay(target);
      return;
    }
    const start = performance.now();
    const duration = 850;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target]);
  return display;
}

/** Reference-inspired "they trust us" band, based only on published reviews. */
export function ReviewTrustPanel({ testimonials, ctaHref, ctaLabel, variant = 'page' }: {
  testimonials: SiteContent['testimonials']; ctaHref: string; ctaLabel: string; variant?: 'page' | 'home';
}) {
  const locale = useSiteLocale();
  const { query, summary } = useCombinedReviewSummary(testimonials);
  const [ref, seen] = useInView<HTMLDivElement>();
  const average = summary.average ?? 0;
  const animatedAverage = useRatingCountUp(average, seen && summary.average !== null);
  const fmt = new Intl.NumberFormat(locale === 'en' ? 'en' : 'fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const isAnchor = ctaHref.startsWith('#');
  const ctaClass = 'trust-cta';
  const cta = isAnchor
    ? <a href={ctaHref} className={ctaClass} data-testid={`link-trust-cta-${variant}`}>{ctaLabel}<ArrowRight size={15} aria-hidden="true" /></a>
    : <Link href={ctaHref} className={ctaClass} data-testid={`link-trust-cta-${variant}`}>{ctaLabel}<ArrowRight size={15} aria-hidden="true" /></Link>;
  const loadingOnlyHistoric = query.isLoading;
  return <div ref={ref} className={`trust-panel trust-panel-${variant} ${seen ? 'is-seen' : ''}`} data-testid={`panel-review-summary-${variant}`}>
    <div className="trust-panel-copy">
      <p className="trust-kicker">{t(locale, 'Avis publiés sur ce site', 'Reviews published on this site')}</p>
      <h2 className="trust-title">{summary.count > 0 ? t(locale, 'Ils nous font confiance', 'They trust us') : t(locale, 'Votre avis compte', 'Your feedback matters')}</h2>
      <p className="trust-note">{t(locale, 'Moyenne calculée à partir des avis publiés sur ce site, visiteurs et témoignages du cabinet confondus. Contributions non vérifiées indépendamment.', 'Average calculated from reviews published on this site, visitor reviews and practice testimonials alike. Contributions are not independently verified.')}</p>
    </div>
    <div className="trust-score">
      {loadingOnlyHistoric ? <div className="trust-skeleton" role="status" data-testid="status-review-summary-loading"><span /><span /><span className="sr-only">{t(locale, 'Calcul de la moyenne…', 'Calculating the average…')}</span></div>
        : summary.average === null ? <div data-testid="status-review-summary-empty">
          <p className="trust-empty-title">{t(locale, 'Aucun avis publié pour le moment', 'No reviews published yet')}</p>
          <p className="trust-note">{t(locale, 'Le premier avis apparaîtra ici après publication.', 'The first review will appear here once published.')}</p>
        </div>
          : <div className="trust-score-inner">
            <p className="trust-average" data-testid="text-review-average">
              <span className="sr-only">{t(locale, `Note moyenne ${fmt.format(average)} sur 5`, `Average rating ${fmt.format(average)} out of 5`)}</span>
              <span aria-hidden="true"><span className="tabular-nums">{fmt.format(animatedAverage)}</span><span className="trust-out-of">/5</span></span>
            </p>
            <RatingStars value={seen ? animatedAverage : 0} countUp={seen} />
            <p className="trust-count" data-testid="text-review-count">
              {t(locale, 'Basée sur', 'Based on')} <b className="tabular-nums">{summary.count}</b> {summary.count > 1 ? t(locale, 'avis publiés', 'published reviews') : t(locale, 'avis publié', 'published review')}
            </p>
          </div>}
      {query.isError && <p className="trust-error" role="alert" data-testid="status-review-summary-error">
        {query.data
          ? t(locale, 'L’actualisation des avis est indisponible ; la dernière moyenne chargée reste affichée.', 'Reviews could not be refreshed; the last loaded average is shown.')
          : t(locale, 'Les avis visiteurs n’ont pas pu être chargés ; seuls les témoignages du cabinet sont comptés.', 'Visitor reviews could not be loaded; only practice testimonials are counted.')}{' '}
        <button type="button" onClick={() => void query.refetch()} className="underline underline-offset-2" data-testid="button-retry-review-summary">{t(locale, 'Réessayer', 'Try again')}</button>
      </p>}
    </div>
    <div className="trust-cta-wrap">{cta}</div>
  </div>;
}

type PageKey = 'soins' | 'galerie' | 'avis' | 'blog' | 'informations';

function Preview({ kind }: { kind: PageKey }) {
  if (kind === 'informations') return <div className="rp-preview rp-video" aria-hidden="true"><span className="rp-play"><PlayCircle size={30} strokeWidth={1.4} /></span><span className="rp-progress"><i /></span></div>;
  if (kind === 'galerie') return <div className="rp-preview rp-gallery" aria-hidden="true"><i /><i /><i /><i /></div>;
  if (kind === 'avis') return <div className="rp-preview rp-quote" aria-hidden="true"><span className="rp-quote-mark">«</span><span className="rp-line" /><span className="rp-line short" /></div>;
  if (kind === 'blog') return <div className="rp-preview rp-page" aria-hidden="true"><span className="rp-line" /><span className="rp-line" /><span className="rp-line short" /><span className="rp-line" /></div>;
  return <div className="rp-preview rp-care" aria-hidden="true"><span className="rp-ring" /><span className="rp-ring r2" /><Stethoscope size={26} strokeWidth={1.4} /></div>;
}

/** Previews of related public pages, with counts taken from real content. */
export function RelatedPages({ content, current }: { content: SiteContent; current?: PageKey }) {
  const locale = useSiteLocale();
  const { summary, query } = useCombinedReviewSummary(content.testimonials);
  const [ref, seen] = useInView<HTMLElement>();
  const active = content.campaigns.filter((c) => c.active);
  const videos = active.filter((c) => c.mediaType === 'video' && c.videoUrl?.trim()).length;
  const posts = content.blogPosts.filter((p) => p.published).length;
  const gallery = content.gallery.filter((g) => g.imageUrl?.trim() && g.id !== 'partner-clinique-la-bienveillance-logo').length;
  const plural = (n: number, fr: [string, string], en: [string, string]) => `${n} ${t(locale, n > 1 ? fr[1] : fr[0], n > 1 ? en[1] : en[0])}`;
  const items: { key: PageKey; href: string; icon: typeof BookOpen; title: string; text: string; stat: string }[] = [
    { key: 'informations', href: '/informations', icon: PlayCircle, title: t(locale, 'Informations', 'Updates'), text: t(locale, 'Vidéos et actualités partagées par le cabinet.', 'Videos and news shared by the practice.'),
      stat: active.length ? `${plural(active.length, ['publication active', 'publications actives'], ['active post', 'active posts'])}${videos ? ` · ${plural(videos, ['vidéo', 'vidéos'], ['video', 'videos'])}` : ''}` : t(locale, 'Bientôt disponible', 'Coming soon') },
    { key: 'soins', href: '/soins', icon: Stethoscope, title: t(locale, 'Nos soins', 'Our services'), text: t(locale, 'Chaque soin expliqué simplement, étape par étape.', 'Each service explained simply, step by step.'),
      stat: content.services.length ? plural(content.services.length, ['soin présenté', 'soins présentés'], ['service listed', 'services listed']) : t(locale, 'En préparation', 'Being prepared') },
    { key: 'avis', href: '/avis', icon: MessageSquareQuote, title: t(locale, 'Avis', 'Reviews'), text: t(locale, 'Les expériences partagées, et la vôtre si vous le souhaitez.', 'Experiences shared, and yours if you wish.'),
      stat: query.isLoading ? t(locale, 'Chargement…', 'Loading…') : summary.count ? plural(summary.count, ['avis publié', 'avis publiés'], ['published review', 'published reviews']) : t(locale, 'Aucun avis pour le moment', 'No reviews yet') },
    { key: 'blog', href: '/blog/', icon: BookOpen, title: t(locale, 'Conseils', 'Advice'), text: t(locale, 'Des repères clairs pour prendre soin de votre bouche.', 'Clear notes to look after your oral health.'),
      stat: posts ? plural(posts, ['article publié', 'articles publiés'], ['published article', 'published articles']) : t(locale, 'Bientôt disponible', 'Coming soon') },
    { key: 'galerie', href: '/galerie', icon: Images, title: t(locale, 'Le cabinet', 'The practice'), text: t(locale, 'Le lieu qui vous accueille, en images.', 'The place that welcomes you, in pictures.'),
      stat: gallery ? plural(gallery, ['visuel en galerie', 'visuels en galerie'], ['gallery image', 'gallery images']) : t(locale, 'Photos du lieu', 'Photos of the setting') },
  ];
  const shown = items.filter((i) => i.key !== current).slice(0, 4);
  return <section ref={ref} className={`related-pages wrap pb-20 ${seen ? 'is-seen' : ''}`} aria-labelledby="related-pages-title" data-testid="section-related-pages">
    <p className="eyebrow">{t(locale, 'Poursuivre la visite', 'Keep exploring')}</p>
    <h2 id="related-pages-title" className="mt-2 font-display text-2xl font-semibold text-[#073e53] md:text-3xl">{t(locale, 'D’autres pages utiles', 'Other useful pages')}</h2>
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {shown.map((item, i) => <li key={item.key} style={{ transitionDelay: `${i * 70}ms` }} className="rp-item">
        <Link href={localizedPath(item.href, locale, content)} className="rp-card" data-testid={`link-related-${item.key}`}>
          <Preview kind={item.key} />
          <span className="rp-body">
            <span className="rp-title"><item.icon size={16} aria-hidden="true" />{item.title}</span>
            <span className="rp-text">{item.text}</span>
            <span className="rp-stat">{item.stat}</span>
          </span>
          <span className="rp-arrow" aria-hidden="true"><ArrowRight size={16} /></span>
        </Link>
      </li>)}
    </ul>
  </section>;
}
