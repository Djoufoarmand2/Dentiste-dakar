import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, ChevronDown, Clock3, Image as ImageIcon, MapPin, Menu,
  MessageCircle, Phone, Play, Quote, X,
} from 'lucide-react';
import type { BlogPost, Campaign, ServiceItem, SiteContent, Testimonial } from '@workspace/api-client-react';
import { Link, useLocation } from 'wouter';

const navItems = [
  ['Soins', '/soins'], ['Notre équipe', '/equipe'], ['Le cabinet', '/galerie'],
  ['Avis', '/avis'], ['Conseils', '/blog'], ['FAQ', '/faq'],
] as const;

export const safeName = (name?: string) => name?.trim() || 'Cabinet Naya';
export const safeCity = (city?: string) => city?.trim() || 'Douala';

const bookHref = (clinic: SiteContent['clinic']) => clinic.bookingUrl || `tel:${clinic.phone || ''}`;

export function LogoWordmark({ clinic, inverse = false }: { clinic?: SiteContent['clinic']; inverse?: boolean }) {
  return <Link href="/" className={`inline-flex shrink-0 items-center gap-3 ${inverse ? 'text-[#f6f4ee]' : 'text-foreground'}`} data-testid="link-home-brand">
    {clinic?.logoUrl?.trim() && <img src={clinic.logoUrl} alt={`${safeName(clinic.name)} logo`} className="h-10 w-10 rounded-md object-contain" data-testid="img-clinic-logo" />}
    <span className="flex flex-col leading-none">
      <span className="whitespace-nowrap font-display text-[20px] font-semibold">{safeName(clinic?.name)}</span>
      <span className={`mt-1 text-[9px] uppercase tracking-[.25em] ${inverse ? 'text-[#d6b56f]' : 'text-accent'}`}>{safeCity(clinic?.city)}</span>
    </span>
  </Link>;
}

export function Header({ clinic, overlay = false }: { clinic?: SiteContent['clinic']; overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  return <header className={`${overlay ? 'absolute inset-x-0 top-0 bg-gradient-to-b from-[#0b1730]/70 to-transparent' : 'relative bg-[#0f1f3d]'} z-30 text-white`}>
    <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-5 py-4 md:px-8">
      <LogoWordmark clinic={clinic} inverse />
      <nav aria-label="Navigation principale" className="hidden items-center gap-7 xl:flex">
        <Link href="/" className="text-[13px] font-medium text-white/90 transition-colors hover:text-[#d6b56f]" data-testid="nav-accueil">Accueil</Link>
        {navItems.map(([label, href]) => <Link key={href} href={href} className="text-[13px] font-medium text-white/90 transition-colors hover:text-[#d6b56f]" data-testid={`nav-${href.slice(1)}`}>{label}</Link>)}
        <Link href="/informations" className="text-[13px] font-medium text-white/90 transition-colors hover:text-[#d6b56f]" data-testid="nav-informations">Informations</Link>
      </nav>
      <Link href="/contact" className="btn-gold hidden whitespace-nowrap xl:inline-flex" data-testid="button-header-rendez-vous">Prendre rendez-vous <ArrowRight size={15} /></Link>
      <button type="button" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open} onClick={() => setOpen(!open)} className="grid h-10 w-10 place-items-center rounded-md border border-white/30 xl:hidden" data-testid="button-menu-mobile">{open ? <X size={19} /> : <Menu size={19} />}</button>
    </div>
    {open && <nav aria-label="Navigation mobile" className="absolute inset-x-0 top-full bg-[#0f1f3d] px-5 pb-6 pt-1 shadow-xl xl:hidden">
      {[['Accueil', '/'] as const, ...navItems, ['Informations', '/informations'] as const, ['Contact', '/contact'] as const].map(([label, href]) => <Link onClick={() => setOpen(false)} key={href} href={href} className="block border-t border-white/10 py-3 text-sm text-white/90" data-testid={`mobile-nav-${href.slice(1) || 'accueil'}`}>{label}</Link>)}
      <Link href="/contact" onClick={() => setOpen(false)} className="btn-gold mt-4 w-full justify-center" data-testid="mobile-button-rendez-vous">Prendre rendez-vous <ArrowRight size={15} /></Link>
    </nav>}
  </header>;
}

export function Footer({ clinic }: { clinic?: SiteContent['clinic'] }) {
  return <footer className="bg-[#0b1730] text-[#f6f4ee]">
    <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 md:grid-cols-[1.2fr_.8fr_.8fr_.9fr] md:px-8 lg:py-16">
      <div><LogoWordmark clinic={clinic} inverse /><p className="mt-5 max-w-sm text-sm leading-7 text-white/65">Un lieu de soin où l’on prend le temps de vous écouter, de vous expliquer et de vous accompagner.</p></div>
      <div><p className="footer-title">Navigation</p><ul className="space-y-2 text-sm text-white/70">{navItems.map(([label, href]) => <li key={href}><Link href={href} className="hover:text-[#d6b56f]" data-testid={`footer-nav-${href.slice(1)}`}>{label}</Link></li>)}<li><Link href="/informations" className="hover:text-[#d6b56f]" data-testid="footer-nav-informations">Informations</Link></li></ul></div>
      <div><p className="footer-title">Nous trouver</p><p className="text-sm leading-7 text-white/70">{clinic?.address || 'Douala, Cameroun'}<br />{safeCity(clinic?.city)}</p><a href={clinic?.mapUrl || 'https://maps.google.com/?q=Douala'} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs text-[#d6b56f] hover:text-white" data-testid="link-footer-map">Itinéraire <ArrowRight size={14} /></a></div>
      <div><p className="footer-title">Contact</p><a href={`tel:${clinic?.phone || ''}`} className="block text-base font-medium" data-testid="link-footer-phone">{clinic?.phone || 'Contactez-nous'}</a><a href={`mailto:${clinic?.email || ''}`} className="mt-2 block text-sm text-white/70" data-testid="link-footer-email">{clinic?.email || 'Adresse à renseigner'}</a><p className="mt-4 whitespace-pre-line text-xs leading-6 text-white/60">{clinic?.openingHours || 'Horaires à renseigner'}</p></div>
    </div>
    <div className="border-t border-white/10"><div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-2 px-5 py-5 text-[11px] text-white/50 md:flex-row md:px-8"><span>© {new Date().getFullYear()} {safeName(clinic?.name)} · Douala</span><span>Une présence attentive, un sourire à la fois.</span></div></div>
  </footer>;
}

export function SiteShell({ children, clinic, overlay = false }: { children: ReactNode; clinic?: SiteContent['clinic']; overlay?: boolean }) {
  return <div className="public-site relative min-h-[100dvh] bg-background text-foreground"><Header clinic={clinic} overlay={overlay} />{children}<Footer clinic={clinic} /></div>;
}

export function LoadingPage() {
  return <div className="mx-auto max-w-6xl px-5 py-24" aria-label="Chargement du site">
    <div className="h-3 w-32 animate-pulse rounded bg-secondary" />
    <div className="mt-8 h-14 max-w-2xl animate-pulse rounded bg-secondary/80" />
    <div className="mt-4 h-5 max-w-xl animate-pulse rounded bg-secondary/60" />
    <div className="mt-12 grid gap-5 md:grid-cols-3">{[1, 2, 3].map((n) => <div key={n} className="h-56 animate-pulse rounded-lg bg-secondary/60" />)}</div>
  </div>;
}

export function FetchError({ retry }: { retry: () => void }) {
  return <div className="mx-auto my-20 max-w-xl rounded-lg border border-border bg-card p-8 text-center" role="alert" data-testid="error-site-content">
    <h2 className="font-display text-2xl">Nous revenons dans un instant</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Le site n’a pas pu charger ses informations. Réessayez dans quelques secondes.</p>
    <button onClick={retry} className="btn-gold mt-6" data-testid="button-retry-content">Réessayer</button>
  </div>;
}

function SectionHead({ eyebrow, title, text, center = true }: { eyebrow: string; title: string; text?: string; center?: boolean }) {
  return <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
    <p className="eyebrow">{eyebrow}</p>
    <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-[#0f1f3d] md:text-[2.6rem]">{title}</h2>
    <span className={`mt-5 block h-[2px] w-14 bg-accent ${center ? 'mx-auto' : ''}`} />
    {text && <p className="mt-5 text-[15px] leading-7 text-muted-foreground">{text}</p>}
  </div>;
}

function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <section className="bg-[#0f1f3d] text-white">
    <div className="mx-auto max-w-[1240px] px-5 pb-16 pt-12 md:px-8 md:pb-20 md:pt-16">
      <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#d6b56f]">{eyebrow}</p>
      <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.1] md:text-[3.4rem]">{title}</h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/75">{text}</p>
    </div>
  </section>;
}

export function ImageFrame({ src, alt, className = '', label = 'Photographie à ajouter' }: { src?: string; alt: string; className?: string; label?: string }) {
  return <div className={`image-empty relative overflow-hidden ${className}`}>
    {src?.trim() ? <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" /> : <div className="absolute inset-0 grid place-items-center p-6 text-center">
      <div className="flex flex-col items-center text-[#0f1f3d]/55"><ImageIcon size={24} strokeWidth={1.3} /><span className="mt-3 max-w-[180px] text-[9px] uppercase tracking-[.2em]">{label}</span></div>
    </div>}
  </div>;
}

function ActionLink({ href, children, variant = 'gold', testId }: { href: string; children: ReactNode; variant?: 'gold' | 'navy' | 'text'; testId: string }) {
  const cls = variant === 'gold' ? 'btn-gold' : variant === 'navy' ? 'btn-navy' : 'inline-flex items-center gap-2 text-sm font-semibold text-[#0f1f3d] transition-colors hover:text-accent';
  return <Link href={href} data-testid={testId} className={cls}>{children}<ArrowRight size={15} /></Link>;
}

function EmptyInline({ title, text }: { title: string; text: string }) {
  return <div className="mt-10 rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center" data-testid="empty-content"><p className="font-display text-xl text-[#0f1f3d]">{title}</p><p className="mt-2 text-sm text-muted-foreground">{text}</p></div>;
}

function SampleNotice() {
  return <div className="mx-auto mb-8 max-w-3xl rounded-md border border-accent/40 bg-[#f7f0de] p-4 text-sm leading-6 text-[#5b4a22]" data-testid="notice-sample-testimonials"><b>Contenu de démonstration :</b> témoignages fictifs, à remplacer par des avis réels avec consentement avant publication.</div>;
}

const serviceAnchor = (s: ServiceItem) => `soin-${s.slug || s.id}`;

function ServiceCard({ item, href }: { item: ServiceItem; href: string }) {
  return <article id={serviceAnchor(item)} className="card-ref group flex scroll-mt-24 flex-col overflow-hidden" data-testid={`card-service-${item.id}`}>
    <ImageFrame src={item.imageUrl} alt={item.title} label="Visuel du soin à ajouter" className="h-52" />
    <div className="flex flex-1 flex-col p-6"><h3 className="font-display text-xl font-semibold text-[#0f1f3d]">{item.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{item.summary || item.description}</p>
      <Link href={href} className="mt-5 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[.12em] text-accent transition-colors hover:text-[#0f1f3d]" data-testid={`link-service-${item.id}`}>En savoir plus <ArrowRight size={14} /></Link></div>
  </article>;
}

function ReviewCard({ review }: { review: Testimonial }) {
  const stars = Math.max(0, Math.min(5, review.rating));
  return <article className="card-ref flex flex-col p-7" data-testid={`card-review-${review.id}`}>
    <Quote className="text-accent" size={22} />
    <p className="mt-4 flex-1 text-[15px] leading-7 text-foreground/85">« {review.quote} »</p>
    <div className="mt-6 flex items-center justify-between border-t border-border pt-4"><div><p className="text-sm font-semibold text-[#0f1f3d]">{review.name}</p><p className="mt-1 text-[10px] uppercase tracking-[.16em] text-muted-foreground">{review.service}</p></div><span className="text-xs tracking-widest text-accent" aria-label={`${stars} sur 5`}>{'★'.repeat(stars)}</span></div>
  </article>;
}

function FaqList({ faqs }: { faqs: SiteContent['faqs'] }) {
  const [expanded, setExpanded] = useState<string | null>(faqs[0]?.id || null);
  return <div className="space-y-3">{faqs.map((faq) => <article key={faq.id} className="card-ref overflow-hidden" data-testid={`faq-item-${faq.id}`}>
    <button type="button" aria-expanded={expanded === faq.id} onClick={() => setExpanded(expanded === faq.id ? null : faq.id)} className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left" data-testid={`button-faq-${faq.id}`}><span className="text-[15px] font-semibold text-[#0f1f3d] md:text-base">{faq.question}</span><ChevronDown className={`shrink-0 text-accent transition-transform ${expanded === faq.id ? 'rotate-180' : ''}`} size={20} /></button>
    {expanded === faq.id && <p className="px-6 pb-6 text-sm leading-7 text-muted-foreground">{faq.answer}</p>}
  </article>)}</div>;
}

function BookButton({ clinic, children, testId, outline = false }: { clinic: SiteContent['clinic']; children: ReactNode; testId: string; outline?: boolean }) {
  return <a href={bookHref(clinic)} target={clinic.bookingUrl ? '_blank' : undefined} rel="noreferrer" className={outline ? 'btn-outline-light' : 'btn-gold'} data-testid={testId}>{children} <ArrowRight size={15} /></a>;
}

const visitSteps = [
  { n: '1', title: 'Prise de contact', text: 'Vous nous appelez ou écrivez pour convenir d’un créneau qui vous convient.' },
  { n: '2', title: 'Accueil et échange', text: 'Nous prenons le temps d’écouter vos attentes et vos antécédents.' },
  { n: '3', title: 'Examen et explications', text: 'Nous vous expliquons ce que nous observons, avec des mots simples.' },
  { n: '4', title: 'Plan de soin partagé', text: 'Vous repartez avec une proposition claire, à décider ensemble.' },
];

export function HomePage({ content }: { content: SiteContent }) {
  const { clinic, hero } = content;
  const lead = content.team[0];
  const heroImg = hero.imageUrl?.trim();
  return <SiteShell clinic={clinic} overlay>
    <main>
      <section className="relative flex min-h-[92dvh] items-center overflow-hidden bg-[#0f1f3d] text-white md:min-h-[100dvh]" data-testid="section-hero">
        {heroImg ? <img src={heroImg} alt="Présentation du cabinet dentaire" className="absolute inset-0 h-full w-full object-cover" data-testid="img-hero" /> : <div aria-hidden className="hero-fallback absolute inset-0" />}
        <div aria-hidden className="absolute inset-0 bg-[#0b1730]/60" />
        <div className="relative z-10 mx-auto w-full max-w-[1240px] px-5 pb-20 pt-32 md:px-8">
          <div className="mx-auto max-w-[620px] reveal">
            {hero.eyebrow && <p className="mb-5 text-[11px] font-semibold uppercase tracking-[.26em] text-[#d6b56f]">{hero.eyebrow}</p>}
            <h1 className="font-display text-[clamp(2.4rem,5.4vw,3.9rem)] font-semibold leading-[1.1]">{hero.title || 'Un sourire en confiance, un soin tout en douceur.'}</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/85">{hero.description || 'À Douala, nous avons imaginé un cabinet où chaque visite commence par une écoute attentive.'}</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <BookButton clinic={clinic} testId="button-hero-book">{hero.primaryAction || 'Prendre rendez-vous'}</BookButton>
              <Link href="/soins" className="btn-outline-light" data-testid="link-hero-care">{hero.secondaryAction || 'Découvrir nos soins'}</Link>
            </div>
          </div>
        </div>
      </section>

      <section id="soins" className="section-pad bg-background">
        <div className="wrap">
          <SectionHead eyebrow="Nos soins" title="Prendre soin, avec justesse." text="Des soins pensés pour préserver votre santé et vous aider à vous sentir bien, tout simplement." />
          {content.services.length ? <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{content.services.slice(0, 6).map((s) => <ServiceCard key={s.id} item={s} href={`/soins#${serviceAnchor(s)}`} />)}</div>
            : <EmptyInline title="Nos soins seront bientôt présentés ici" text="Les informations du cabinet seront mises à jour prochainement." />}
          <div className="mt-10 text-center"><ActionLink href="/soins" variant="navy" testId="link-home-all-services">Tous les soins</ActionLink></div>
        </div>
      </section>

      <section id="galerie" className="section-pad bg-[#eef1f6]">
        <div className="wrap">
          <SectionHead eyebrow="Le cabinet" title="Un lieu pensé pour votre confort." text="Un aperçu de l’atmosphère qui vous attend." />
          {content.gallery.length ? <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">{content.gallery.slice(0, 6).map((p) => <figure key={p.id} className="overflow-hidden rounded-md" data-testid={`home-gallery-${p.id}`}><ImageFrame src={p.imageUrl} alt={p.alt} label="Photo du cabinet à ajouter" className="aspect-[4/3] transition-transform duration-500 hover:scale-[1.03]" /><figcaption className="sr-only">{p.alt}</figcaption></figure>)}</div>
            : <EmptyInline title="L’espace se dévoilera bientôt" text="La galerie du cabinet est en préparation." />}
          <div className="mt-10 text-center"><ActionLink href="/galerie" variant="navy" testId="link-home-gallery">Voir la galerie</ActionLink></div>
        </div>
      </section>

      <section id="praticien" className="section-pad bg-background">
        <div className="wrap grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <ImageFrame src={lead?.imageUrl} alt={lead ? `Portrait de ${lead.name}` : 'Présentation de l’équipe'} label="Portrait à ajouter" className="aspect-[4/5] w-full rounded-md md:max-h-[560px]" />
          <div>
            <SectionHead center={false} eyebrow={lead?.role || 'Votre praticien'} title={lead?.name || 'Une équipe, avant tout humaine.'} />
            <p className="mt-6 text-[15px] leading-7 text-muted-foreground">{lead?.biography || 'Nous sommes là pour vous accueillir tels que vous êtes et construire avec vous un parcours de soin qui a du sens.'}</p>
            <div className="mt-8"><ActionLink href="/equipe" testId="link-home-team">Rencontrer l’équipe</ActionLink></div>
          </div>
        </div>
      </section>

      <section id="premiere-visite" className="section-pad bg-[#0f1f3d] text-white">
        <div className="wrap">
          <div className="mx-auto max-w-2xl text-center"><p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#d6b56f]">Votre première visite</p><h2 className="mt-3 font-display text-3xl font-semibold md:text-[2.6rem]">Comment se déroule un premier rendez-vous ?</h2><span className="mx-auto mt-5 block h-[2px] w-14 bg-accent" /></div>
          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{visitSteps.map((s) => <li key={s.n} className="rounded-md border border-white/12 bg-white/[.04] p-6" data-testid={`step-visit-${s.n}`}><span className="font-display text-3xl font-semibold text-[#d6b56f]">0{s.n}</span><h3 className="mt-3 text-base font-semibold">{s.title}</h3><p className="mt-2 text-sm leading-6 text-white/70">{s.text}</p></li>)}</ol>
        </div>
      </section>

      <section id="avis" className="section-pad bg-[#eef1f6]">
        <div className="wrap">
          <SectionHead eyebrow="Témoignages" title="La confiance se construit ensemble." />
          <div className="mt-10"><SampleNotice /></div>
          {content.testimonials.length ? <div className="grid gap-6 md:grid-cols-3">{content.testimonials.slice(0, 3).map((r) => <ReviewCard key={r.id} review={r} />)}</div>
            : <EmptyInline title="Votre expérience compte" text="Les avis seront affichés ici lorsqu’ils seront disponibles." />}
          <div className="mt-10 text-center"><ActionLink href="/avis" variant="navy" testId="link-home-reviews">Tous les témoignages</ActionLink></div>
        </div>
      </section>

      <section id="faq" className="section-pad bg-background">
        <div className="mx-auto max-w-3xl px-5 md:px-8">
          <SectionHead eyebrow="Questions fréquentes" title="Les réponses, sans détour." />
          <div className="mt-10">{content.faqs.length ? <FaqList faqs={content.faqs.slice(0, 5)} /> : <EmptyInline title="Une question particulière ?" text="Contactez-nous, nous serons heureux de vous répondre." />}</div>
          <div className="mt-8 text-center"><ActionLink href="/faq" variant="text" testId="link-home-faq">Toutes les questions</ActionLink></div>
        </div>
      </section>

      <section id="rendez-vous" className="bg-[#0f1f3d] text-white">
        <div className="wrap grid gap-10 py-16 md:grid-cols-[1.2fr_1fr] md:items-center md:py-24">
          <div><p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#d6b56f]">Prendre rendez-vous</p><h2 className="mt-3 font-display text-3xl font-semibold leading-tight md:text-[2.6rem]">Votre prochain rendez-vous peut être plus simple que vous ne le pensez.</h2><div className="mt-8 flex flex-wrap gap-4"><BookButton clinic={clinic} testId="button-home-final-book">Prendre rendez-vous</BookButton><Link href="/contact" className="btn-outline-light" data-testid="link-home-contact">Nous contacter</Link></div></div>
          <ul className="space-y-5 rounded-md border border-white/12 bg-white/[.04] p-7 text-sm">
            <li className="flex gap-4"><Phone size={18} className="mt-0.5 shrink-0 text-[#d6b56f]" /><a href={`tel:${clinic.phone || ''}`} data-testid="link-home-phone">{clinic.phone || 'Téléphone à renseigner'}</a></li>
            <li className="flex gap-4"><MessageCircle size={18} className="mt-0.5 shrink-0 text-[#d6b56f]" /><a href={`mailto:${clinic.email || ''}`} className="break-all" data-testid="link-home-email">{clinic.email || 'Courriel à renseigner'}</a></li>
            <li className="flex gap-4"><MapPin size={18} className="mt-0.5 shrink-0 text-[#d6b56f]" /><span>{clinic.address || 'Douala, Cameroun'}</span></li>
            <li className="flex gap-4"><Clock3 size={18} className="mt-0.5 shrink-0 text-[#d6b56f]" /><span className="whitespace-pre-line text-white/80">{clinic.openingHours || 'Horaires à renseigner'}</span></li>
          </ul>
        </div>
      </section>
    </main>
  </SiteShell>;
}

export function ServicesPage({ content }: { content: SiteContent }) {
  const [location] = useLocation();
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(decodeURIComponent(hash))?.scrollIntoView({ block: 'start' });
  }, [location]);
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Des soins à votre mesure" title="La santé d’abord. Le confort, toujours." text="Nous prenons soin de votre sourire avec une approche préventive, des gestes précis et des explications qui vous ressemblent." />
    <section className="wrap section-pad">
      {content.services.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{content.services.map((s) => <ServiceCard key={s.id} item={s} href="/contact" />)}</div> : <EmptyInline title="La carte des soins se prépare" text="Revenez bientôt pour découvrir les soins proposés par le cabinet." />}
      <div className="mt-16 flex flex-col gap-6 rounded-md bg-[#0f1f3d] p-8 text-white md:flex-row md:items-center md:justify-between md:p-10"><div><h2 className="font-display text-2xl font-semibold md:text-3xl">Une question avant de venir ?</h2><p className="mt-2 text-sm text-white/70">Nous sommes là pour vous orienter, sans engagement.</p></div><ActionLink href="/contact" testId="link-services-contact">Échanger avec nous</ActionLink></div>
    </section></main></SiteShell>;
}

export function TeamPage({ content }: { content: SiteContent }) {
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Derrière chaque sourire" title="Une équipe, avant tout humaine." text="Nous sommes là pour vous accueillir tels que vous êtes et construire avec vous un parcours de soin qui a du sens." />
    <section className="wrap section-pad">{content.team.length ? <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{content.team.map((m) => <article key={m.id} className="card-ref overflow-hidden" data-testid={`card-team-${m.id}`}><ImageFrame src={m.imageUrl} alt={`Portrait de ${m.name}`} label="Portrait à ajouter" className="aspect-[4/5]" /><div className="p-6"><p className="eyebrow">{m.role}</p><h2 className="mt-2 font-display text-2xl font-semibold text-[#0f1f3d]">{m.name}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{m.biography}</p></div></article>)}</div> : <EmptyInline title="Faisons connaissance bientôt" text="Les portraits et présentations de l’équipe seront publiés ici." />}
    </section></main></SiteShell>;
}

export function GalleryPage({ content }: { content: SiteContent }) {
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Le cabinet en images" title="Un lieu pensé pour votre confort." text="Un aperçu de l’atmosphère qui vous attend. Les images de présentation seront ajoutées par l’équipe du cabinet." />
    <section className="wrap section-pad">{content.gallery.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">{content.gallery.map((p) => <figure key={p.id} className="overflow-hidden rounded-md" data-testid={`gallery-image-${p.id}`}><ImageFrame src={p.imageUrl} alt={p.alt} label="Photo du cabinet à ajouter" className="aspect-[4/3]" /><figcaption className="sr-only">{p.alt}</figcaption></figure>)}</div> : <EmptyInline title="L’espace se dévoilera bientôt" text="La galerie du cabinet est en préparation." />}</section></main></SiteShell>;
}

export function ReviewsPage({ content }: { content: SiteContent }) {
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Vos mots comptent" title="La confiance se construit ensemble." text="Chaque retour nous aide à mieux vous accueillir. Les témoignages ci-dessous sont des exemples de présentation et doivent être remplacés avant le lancement." />
    <section className="wrap section-pad"><SampleNotice />
      {content.testimonials.length ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{content.testimonials.map((r) => <ReviewCard key={r.id} review={r} />)}</div> : <EmptyInline title="Votre expérience compte" text="Les avis seront affichés ici lorsqu’ils seront disponibles." />}
      <div className="mt-12 text-center"><ActionLink href="/contact" testId="link-reviews-contact">Nous laisser un message</ActionLink></div>
    </section></main></SiteShell>;
}

export function FAQPage({ content }: { content: SiteContent }) {
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Questions fréquentes" title="Les réponses, sans détour." text="Vous préparer à votre visite, c’est déjà prendre soin de vous. Voici les réponses aux questions que l’on nous pose souvent." />
    <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">{content.faqs.length ? <FaqList faqs={content.faqs} /> : <EmptyInline title="Une question particulière ?" text="Contactez-nous, nous serons heureux de vous répondre." />}
      <div className="mt-12 rounded-md bg-[#0f1f3d] p-8 text-white"><h2 className="font-display text-2xl font-semibold">Votre question n’est pas ici ?</h2><p className="mt-2 text-sm text-white/70">Notre équipe est à votre écoute.</p><div className="mt-5"><ActionLink href="/contact" testId="link-faq-contact">Nous contacter</ActionLink></div></div>
    </section></main></SiteShell>;
}

function BlogCard({ post }: { post: BlogPost }) {
  return <article className="card-ref overflow-hidden" data-testid={`card-blog-${post.id}`}><Link href={`/blog/${post.slug}`} className="block" data-testid={`link-blog-${post.slug}`}><ImageFrame src={post.imageUrl} alt={post.title} label="Illustration de l’article à ajouter" className="h-52" /><div className="p-6"><p className="text-[10px] uppercase tracking-[.16em] text-accent">{post.date} · {post.author}</p><h2 className="mt-3 font-display text-xl font-semibold leading-snug text-[#0f1f3d]">{post.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{post.excerpt}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-accent">Lire l’article <ArrowRight size={14} /></span></div></Link></article>;
}

export function BlogPage({ content }: { content: SiteContent }) {
  const posts = content.blogPosts.filter((p) => p.published);
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Le carnet Naya" title="Quelques repères pour votre sourire." text="Des conseils simples, des idées reçues éclaircies et des réponses pour prendre soin de votre santé bucco-dentaire au quotidien." />
    <section className="wrap section-pad">{posts.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{posts.map((p) => <BlogCard key={p.id} post={p} />)}</div> : <EmptyInline title="Le carnet prend forme" text="Nos premiers conseils et articles seront publiés prochainement." />}</section></main></SiteShell>;
}

export function BlogArticlePage({ content, slug }: { content: SiteContent; slug?: string }) {
  const post = content.blogPosts.find((c) => c.slug === slug && c.published);
  if (!post) return <SiteShell clinic={content.clinic}><main className="mx-auto max-w-3xl px-5 py-24 text-center"><p className="eyebrow">Article introuvable</p><h1 className="mt-4 font-display text-4xl font-semibold text-[#0f1f3d]">Ce carnet n’a pas encore cette page.</h1><div className="mt-7"><ActionLink href="/blog" testId="link-article-back">Retour au carnet</ActionLink></div></main></SiteShell>;
  return <SiteShell clinic={content.clinic}><main><article className="mx-auto max-w-4xl px-5 pb-24 pt-12 md:px-8 md:pt-16"><Link href="/blog" className="inline-flex items-center gap-2 text-xs font-semibold text-accent" data-testid="link-back-blog"><ArrowLeft size={14} /> Tous les articles</Link><p className="mt-10 text-[10px] uppercase tracking-[.2em] text-accent">{post.date} · {post.author}</p><h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-[#0f1f3d] md:text-5xl">{post.title}</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{post.excerpt}</p><ImageFrame src={post.imageUrl} alt={post.title} label="Illustration de l’article à ajouter" className="mt-10 h-[280px] rounded-md md:h-[440px]" /><div className="prose prose-lg mt-10 max-w-none whitespace-pre-line font-sans leading-8 text-foreground/80">{post.content}</div></article></main></SiteShell>;
}

function CampaignGrid({ campaigns }: { campaigns: Campaign[] }) {
  return <div className="grid gap-6 md:grid-cols-2">{campaigns.map((c) => <article key={c.id} className="card-ref overflow-hidden" data-testid={`card-campaign-${c.id}`}><div className="relative"><ImageFrame src={c.imageUrl} alt={c.title} label={c.mediaType === 'video' ? 'Miniature vidéo à ajouter' : 'Visuel à ajouter'} className="h-60" />{c.mediaType === 'video' && c.videoUrl && <a href={c.videoUrl} target="_blank" rel="noreferrer" aria-label={`Voir la vidéo : ${c.title}`} className="absolute inset-0 grid place-items-center bg-[#0b1730]/25" data-testid={`link-campaign-video-${c.id}`}><span className="grid h-14 w-14 place-items-center rounded-md bg-accent text-[#0f1f3d]"><Play fill="currentColor" size={20} /></span></a>}</div><div className="p-6"><h2 className="font-display text-xl font-semibold text-[#0f1f3d]">{c.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{c.description}</p></div></article>)}</div>;
}

export function InformationPage({ content }: { content: SiteContent }) {
  const campaigns = content.campaigns.filter((c) => c.active);
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Informations du cabinet" title="Les nouvelles de la maison." text="Campagnes, actualités et informations utiles partagées par l’équipe du cabinet." /><section className="wrap section-pad">{campaigns.length ? <CampaignGrid campaigns={campaigns} /> : <EmptyInline title="Rien de nouveau pour le moment" text="Les informations utiles seront partagées ici dès qu’elles seront disponibles." />}</section></main></SiteShell>;
}

export function ContactPage({ content }: { content: SiteContent }) {
  const clinic = content.clinic;
  const row = (icon: ReactNode, label: string, value: ReactNode) => <><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white/10 text-[#d6b56f]">{icon}</span><span><b className="block font-semibold">{label}</b><span className="mt-1 block whitespace-pre-line text-white/70">{value}</span></span></>;
  return <SiteShell clinic={clinic}><main><PageIntro eyebrow="Prenons le temps d’échanger" title="Nous sommes tout près." text="Un rendez-vous, une question, un besoin d’orientation ? Contactez-nous comme vous le souhaitez." />
    <section className="wrap section-pad grid gap-7 md:grid-cols-[.9fr_1.1fr]">
      <div className="rounded-md bg-[#0f1f3d] p-7 text-white md:p-10"><p className="text-[11px] uppercase tracking-[.24em] text-[#d6b56f]">{safeName(clinic.name)} · {safeCity(clinic.city)}</p><h2 className="mt-4 font-display text-3xl font-semibold">À votre écoute.</h2><div className="mt-8 space-y-6 text-sm">
        <a href={`tel:${clinic.phone}`} className="flex items-start gap-4" data-testid="link-contact-phone">{row(<Phone size={17} />, 'Téléphone', clinic.phone || 'À renseigner')}</a>
        <a href={`mailto:${clinic.email}`} className="flex items-start gap-4" data-testid="link-contact-email">{row(<MessageCircle size={17} />, 'Courriel', clinic.email || 'À renseigner')}</a>
        <div className="flex items-start gap-4" data-testid="text-contact-address">{row(<MapPin size={17} />, 'Adresse', clinic.address || 'Douala, Cameroun')}</div>
        <div className="flex items-start gap-4" data-testid="text-contact-hours">{row(<Clock3 size={17} />, 'Horaires', clinic.openingHours || 'À renseigner')}</div>
      </div><div className="mt-9"><BookButton clinic={clinic} testId="button-contact-book">Demander un rendez-vous</BookButton></div></div>
      <div className="card-ref flex min-h-[360px] flex-col overflow-hidden">
        {clinic.mapUrl ? <iframe title="Carte pour rejoindre le cabinet" src={clinic.mapUrl} loading="lazy" className="h-full min-h-[360px] w-full border-0" referrerPolicy="no-referrer-when-downgrade" data-testid="map-contact" /> : <div className="flex flex-1 flex-col items-center justify-center bg-[#eef1f6] p-8 text-center"><MapPin size={26} className="text-accent" /><h2 className="mt-5 font-display text-2xl font-semibold text-[#0f1f3d]">Au cœur de {safeCity(clinic.city)}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{clinic.address || 'L’adresse précise du cabinet sera publiée ici.'}</p><p className="mt-4 text-[10px] uppercase tracking-[.16em] text-accent">Carte à configurer dans l’espace administrateur</p></div>}
      </div>
    </section>
  </main></SiteShell>;
}
