import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, ChevronDown, Clock3, Image as ImageIcon, MapPin, Menu,
  MessageCircle, Phone, Quote, Sparkles, X,
} from 'lucide-react';
import type { BlogPost, Campaign, ServiceItem, SiteContent, Testimonial } from '@workspace/api-client-react';
import { Link, useLocation } from 'wouter';
import { AppointmentRequestForm } from './appointment-request-form';
import { ReviewSubmissionForm } from './review-submission-form';
import { VideoPlayer } from './video-player';
import { combinePublicReviews, usePublicReviews } from '@/lib/reviews';
import heroIllustration from '@/lib/hero-illustration.json';
import { supabaseUrl } from '@/lib/supabase';

const navItems = [
  ['Soins', '/soins'], ['Notre équipe', '/equipe'], ['Le cabinet', '/galerie'],
  ['Avis', '/avis'], ['Conseils', '/blog/'], ['FAQ', '/faq'],
] as const;

const partnerLogoId = 'partner-clinique-la-bienveillance-logo';
const partnerPhotoId = 'photo-clinique-la-bienveillance';
const partnerSite = 'https://cliniquelabienveillance.com';
const mapsDirections = 'https://www.google.com/maps/place/Clinique+La+Bienveillance/@4.0307524,9.7258638,17z/data=!4m6!3m5!1s0x10610d2ffb339343:0xcc207a6138777c30!8m2!3d4.0307524!4d9.7307347!16s%2Fg%2F11fltnv9l8';
const mapEmbedUrl = 'https://maps.google.com/maps?q=4.0307524%2C9.7307347&z=17&output=embed';

export const safeName = (name?: string) => name?.trim() || 'Cabinet Sourire Serein';
export const safeCity = (city?: string) => city?.trim() || 'Douala';
const brandMarkUrl = `${import.meta.env.BASE_URL}brand/logo-mark.webp`;
const clinicPhotoUrl = (filename: string) => `${import.meta.env.BASE_URL}images/clinic/${filename}`;
const clinicGalleryPhotos = [
  {
    id: 'clinic-sign',
    src: clinicPhotoUrl('clinic-sign.jpg'),
    alt: 'Enseigne extérieure de la Clinique La Bienveillance à Douala.',
    caption: 'L’enseigne de la Clinique La Bienveillance',
  },
  {
    id: 'clinic-professional',
    src: clinicPhotoUrl('clinic-professional.jpg'),
    alt: 'Un professionnel de santé travaille à son bureau au cabinet.',
    caption: 'Un temps de travail au cabinet',
  },
  {
    id: 'waiting-room',
    src: clinicPhotoUrl('waiting-room.jpg'),
    alt: 'La salle d’attente de l’établissement partenaire.',
    caption: 'L’espace d’accueil',
  },
  {
    id: 'care-team-conversation',
    src: clinicPhotoUrl('care-team-conversation.jpg'),
    alt: 'Une professionnelle échange avec une patiente dans les locaux de l’établissement partenaire.',
    caption: 'Un temps d’échange',
  },
  {
    id: 'family-welcome',
    src: clinicPhotoUrl('family-welcome.jpg'),
    alt: 'Une soignante accueille une famille au sein de l’établissement partenaire.',
    caption: 'L’accueil des familles',
  },
  {
    id: 'patient-support',
    src: clinicPhotoUrl('patient-support.jpg'),
    alt: 'Une professionnelle accompagne une patiente lors d’un échange au cabinet.',
    caption: 'Un accompagnement attentif',
  },
];
const visibleGallery = (gallery: SiteContent['gallery']) => gallery.filter((item) => item.id !== partnerLogoId);
const galleryCaption = (item: SiteContent['gallery'][number]) => {
  const captions: Record<string, string> = {
    'photo-clinique-la-bienveillance': 'Façade de la Clinique La Bienveillance',
    'illustration-consultation-dentaire': 'Consultation dentaire',
    'illustration-detartrage-polissage': 'Détartrage et polissage',
    'illustration-traitement-caries': 'Traitement des caries',
    'illustration-plombage-composite': 'Plombage et composite',
    'illustration-kinesitherapie-maxillo-faciale': 'Kinésithérapie maxillo-faciale',
    'illustration-laboratoire-prothetique': 'Laboratoire prothétique',
    'illustration-chirurgie-dentaire': 'Chirurgie dentaire',
    'illustration-maternite-clinique-bienveillance': 'Maternité · Clinique La Bienveillance',
  };
  return captions[item.id] ?? item.alt;
};

const bookHref = (clinic: SiteContent['clinic']) => clinic.bookingUrl || `tel:${clinic.phone || ''}`;

export function LogoWordmark({ clinic, inverse = false }: { clinic?: SiteContent['clinic']; inverse?: boolean }) {
  return <Link href="/" aria-label={`${safeName(clinic?.name)} — accueil`} className={`brand-wordmark inline-flex shrink-0 items-center gap-3 ${inverse ? 'text-[#ffffff]' : 'text-foreground'}`} data-testid="link-home-brand">
    <span className="brand-mark-frame" aria-hidden="true">
      <img src={clinic?.logoUrl?.trim() || brandMarkUrl} alt="" width="64" height="48" className="brand-mark-image" data-testid="img-clinic-logo" />
    </span>
    <span className="flex flex-col leading-none">
      <span className="whitespace-nowrap font-display text-[20px] font-semibold">{safeName(clinic?.name)}</span>
      <span className={`mt-1 text-[9px] uppercase tracking-[.25em] ${inverse ? 'text-[#f0a0a6]' : 'text-accent'}`}>{safeCity(clinic?.city)}</span>
    </span>
  </Link>;
}

function BrandLockup({ clinic }: { clinic?: SiteContent['clinic'] }) {
  return <Link href="/" aria-label={`${safeName(clinic?.name)} — accueil`} className="brand-wordmark inline-flex shrink-0 items-center gap-3 text-white" data-testid="link-footer-brand">
    <span className="brand-mark-frame" aria-hidden="true">
      <img src={clinic?.logoUrl?.trim() || brandMarkUrl} alt="" width="64" height="48" className="brand-mark-image" />
    </span>
    <span className="flex flex-col leading-none">
      <span className="whitespace-nowrap font-display text-[20px] font-semibold">{safeName(clinic?.name)}</span>
      <span className="mt-1 text-[9px] uppercase tracking-[.2em] text-white/65">Cabinet dentaire · {safeCity(clinic?.city)}</span>
    </span>
  </Link>;
}

export function Header({ clinic, overlay = false }: { clinic?: SiteContent['clinic']; overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lightHeader = !overlay || scrolled;
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return <header className={`public-header ${overlay ? `home-header ${scrolled ? 'is-scrolled' : ''}` : ''} ${lightHeader ? 'header-light' : 'header-transparent'}`}>
    <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-5 py-4 md:px-8">
      <LogoWordmark clinic={clinic} inverse={!lightHeader} />
      <nav aria-label="Navigation principale" className="hidden items-center gap-7 xl:flex">
        <Link href="/" className={`text-[13px] font-medium transition-colors hover:text-[#b94f5b] ${lightHeader ? 'text-[#073e53]' : 'text-white/90'}`} data-testid="nav-accueil">Accueil</Link>
        {navItems.map(([label, href]) => <Link key={href} href={href} className={`text-[13px] font-medium transition-colors hover:text-[#b94f5b] ${lightHeader ? 'text-[#073e53]' : 'text-white/90'}`} data-testid={`nav-${href.slice(1)}`}>{label}</Link>)}
        <Link href="/informations" className={`text-[13px] font-medium transition-colors hover:text-[#b94f5b] ${lightHeader ? 'text-[#073e53]' : 'text-white/90'}`} data-testid="nav-informations">Informations</Link>
      </nav>
      <Link href="/contact" className="btn-gold hidden whitespace-nowrap xl:inline-flex" data-testid="button-header-rendez-vous">Prendre rendez-vous <ArrowRight size={15} /></Link>
      <button type="button" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open} onClick={() => setOpen(!open)} className={`grid h-10 w-10 place-items-center rounded-md border xl:hidden ${lightHeader ? 'border-[#073e53]/25 text-[#073e53]' : 'border-white/30 text-white'}`} data-testid="button-menu-mobile">{open ? <X size={19} /> : <Menu size={19} />}</button>
    </div>
    {open && <nav aria-label="Navigation mobile" className={`absolute inset-x-0 top-full px-5 pb-6 pt-1 shadow-xl xl:hidden ${lightHeader ? 'bg-white' : 'bg-[#073e53]'}`}>
      {[['Accueil', '/'] as const, ...navItems, ['Informations', '/informations'] as const, ['Contact', '/contact'] as const].map(([label, href]) => <Link onClick={() => setOpen(false)} key={href} href={href} className={`block border-t py-3 text-sm ${lightHeader ? 'border-[#073e53]/10 text-[#073e53]' : 'border-white/10 text-white/90'}`} data-testid={`mobile-nav-${href.slice(1) || 'accueil'}`}>{label}</Link>)}
      <Link href="/contact" onClick={() => setOpen(false)} className="btn-gold mt-4 w-full justify-center" data-testid="mobile-button-rendez-vous">Prendre rendez-vous <ArrowRight size={15} /></Link>
    </nav>}
  </header>;
}

export function Footer({ clinic }: { clinic?: SiteContent['clinic'] }) {
  return <footer className="bg-[#070116] text-[#ffffff]">
    <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 md:grid-cols-[1.2fr_.8fr_.8fr_.9fr] md:px-8 lg:py-16">
      <div><BrandLockup clinic={clinic} /><p className="mt-5 max-w-sm text-sm leading-7 text-white/65">Un lieu de soin où l’on prend le temps de vous écouter, de vous expliquer et de vous accompagner.</p></div>
      <div><p className="footer-title">Navigation</p><ul className="space-y-2 text-sm text-white/70">{navItems.map(([label, href]) => <li key={href}><Link href={href} className="hover:text-[#f0a0a6]" data-testid={`footer-nav-${href.slice(1)}`}>{label}</Link></li>)}<li><Link href="/informations" className="hover:text-[#f0a0a6]" data-testid="footer-nav-informations">Informations</Link></li><li><Link href="/confidentialite" className="hover:text-[#f0a0a6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" data-testid="footer-nav-confidentialite">Confidentialité</Link></li></ul></div>
      <div><p className="footer-title">Nous trouver</p><p className="text-sm leading-7 text-white/70">{clinic?.address || 'Douala, Cameroun'}<br />{safeCity(clinic?.city)}</p><a href={clinic?.mapUrl || mapsDirections} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs text-[#f0a0a6] hover:text-white" data-testid="link-footer-map">Itinéraire <ArrowRight size={14} /></a><a href={partnerSite} target="_blank" rel="noopener noreferrer" className="mt-3 block text-xs text-white/60 hover:text-white">Établissement partenaire : La Bienveillance</a></div>
      <div><p className="footer-title">Contact</p><a href={`tel:${clinic?.phone || ''}`} className="block text-base font-medium" data-testid="link-footer-phone">{clinic?.phone || 'Contactez-nous'}</a><a href={`mailto:${clinic?.email || ''}`} className="mt-2 block text-sm text-white/70" data-testid="link-footer-email">{clinic?.email || 'Adresse à renseigner'}</a><p className="mt-4 whitespace-pre-line text-xs leading-6 text-white/60">{clinic?.openingHours || 'Horaires à renseigner'}</p></div>
    </div>
    <div className="border-t border-white/10"><div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-2 px-5 py-5 text-[11px] text-white/75 md:flex-row md:px-8"><span>© {new Date().getFullYear()} {safeName(clinic?.name)} · Douala</span><span>Une présence attentive, un sourire à la fois.</span></div></div>
  </footer>;
}

function AnnouncementBar({ clinic }: { clinic?: SiteContent['clinic'] }) {
  const hours = clinic?.openingHours?.trim().replace(/\s*\n\s*/g, ' · ');
  const message = hours ? `Horaires du cabinet : ${hours}` : 'Pour un rendez-vous, contactez le cabinet ou envoyez une demande en ligne.';
  return <div className="announcement-bar" role="region" aria-label="Informations du cabinet" data-testid="announcement-hours">
    <span className="sr-only">{message}</span>
    <div className="announcement-marquee" aria-hidden="true">
      <div className="announcement-track">
        {[0, 1].map((group) => <div className="announcement-group" key={group}>
          {Array.from({ length: 5 }, (_, item) => <span className="announcement-item" key={`${group}-${item}`}>
            <Clock3 size={13} aria-hidden="true" />
            {message}
            <span className="announcement-divider" aria-hidden="true">✦</span>
          </span>)}
        </div>)}
      </div>
    </div>
    <div className="announcement-static" aria-hidden="true"><Clock3 size={13} />{message}</div>
  </div>;
}

function FloatingCallButton({ clinic }: { clinic?: SiteContent['clinic'] }) {
  const phoneDigits = clinic?.phone?.replace(/\D/g, '') || '237677873442';
  return <a
    href={`https://wa.me/${phoneDigits}`}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`Écrire à ${safeName(clinic?.name)} sur WhatsApp au ${clinic?.phone || '+237 677 87 34 42'}`}
    title="Contacter le cabinet sur WhatsApp"
    className="floating-call grid h-14 w-14 place-items-center rounded-full bg-[#073e53] text-white shadow-[0_8px_24px_rgba(7,1,22,.24)] transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#f0a0a6]"
    data-testid="button-floating-whatsapp"
  >
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.371-.272.297-1.04 1.016-1.04 2.479s1.065 2.875 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.438-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.438 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05.02C5.495.02.161 5.354.158 11.908c-.001 2.096.547 4.143 1.588 5.946L.057 23.998l6.282-1.648a11.85 11.85 0 0 0 5.711 1.457h.005c6.554 0 11.89-5.334 11.894-11.89a11.82 11.82 0 0 0-3.484-8.429z" />
    </svg>
  </a>;
}

export function SiteShell({ children, clinic, overlay = false }: { children: ReactNode; clinic?: SiteContent['clinic']; overlay?: boolean }) {
  useEffect(() => {
    const root = document.documentElement;
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.classList.add('motion-ready');
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.public-site main > section, .public-site .card-ref, .public-site figure[data-testid]'));
    elements.forEach((element) => element.classList.add('reveal-on-scroll'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -36px 0px' });
    elements.forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      root.classList.remove('motion-ready');
      elements.forEach((element) => element.classList.remove('reveal-on-scroll', 'is-visible'));
    };
  }, []);
  return <div className="public-site relative min-h-[100dvh] bg-background text-foreground"><AnnouncementBar clinic={clinic} /><Header clinic={clinic} overlay={overlay} />{children}<Footer clinic={clinic} /><FloatingCallButton clinic={clinic} /></div>;
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
    <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-[#073e53] md:text-[2.6rem]">{title}</h2>
    <span className={`mt-5 block h-[2px] w-14 bg-[#b94f5b] ${center ? 'mx-auto' : ''}`} />
    {text && <p className="mt-5 text-[15px] leading-7 text-muted-foreground">{text}</p>}
  </div>;
}

function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <section className="bg-[#073e53] text-white">
    <div className="mx-auto max-w-[1240px] px-5 pb-16 pt-12 md:px-8 md:pb-20 md:pt-16">
      <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#f0a0a6]">{eyebrow}</p>
      <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.1] md:text-[3.4rem]">{title}</h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/75">{text}</p>
    </div>
  </section>;
}

export function ImageFrame({ src, alt, className = '', label = 'Photographie à ajouter', indicator, details, priority = false }: { src?: string; alt: string; className?: string; label?: string; indicator?: string; details?: string; priority?: boolean }) {
  const [isActive, setIsActive] = useState(false);
  const hasImage = !!src?.trim();
  const indicatorText = indicator?.trim() || label;
  const detailText = details?.trim() || alt;

  return <div
    className={`image-empty image-frame-interactive relative overflow-hidden ${className}`}
    role="group"
    aria-label={`Visuel : ${indicatorText}`}
    tabIndex={0}
    data-image-active={isActive}
    onPointerEnter={(event) => { if (event.pointerType !== 'touch') setIsActive(true); }}
    onPointerLeave={() => setIsActive(false)}
    onFocusCapture={() => setIsActive(true)}
    onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsActive(false);
    }}
  >
    {hasImage ? <>
      <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" className="h-full w-full object-cover" />
      <span className="image-indicator" aria-hidden="true"><Sparkles size={12} strokeWidth={2.2} /><span className="image-indicator-label">{indicatorText}</span></span>
      <div className={`image-context ${isActive ? 'is-active' : ''}`} aria-hidden={!isActive}>
        <span className="image-context-kicker">À découvrir</span>
        <p>{detailText}</p>
      </div>
    </> : <div className="absolute inset-0 grid place-items-center p-6 text-center">
      <div className="flex flex-col items-center text-[#070116]"><ImageIcon size={24} strokeWidth={1.3} /><span className="mt-3 max-w-[180px] text-[9px] uppercase tracking-[.2em]">{label}</span></div>
    </div>}
  </div>;
}

function ActionLink({ href, children, variant = 'gold', testId }: { href: string; children: ReactNode; variant?: 'gold' | 'navy' | 'text'; testId: string }) {
  const cls = variant === 'gold' ? 'btn-gold' : variant === 'navy' ? 'btn-navy' : 'inline-flex items-center gap-2 text-sm font-semibold text-[#073e53] transition-colors hover:text-accent';
  return <Link href={href} data-testid={testId} className={cls}>{children}<ArrowRight size={15} /></Link>;
}

function EmptyInline({ title, text }: { title: string; text: string }) {
  return <div className="mt-10 rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center" data-testid="empty-content"><p className="font-display text-xl text-[#073e53]">{title}</p><p className="mt-2 text-sm text-muted-foreground">{text}</p></div>;
}

const serviceAnchor = (s: ServiceItem) => `soin-${s.slug || s.id}`;

function ServiceCard({ item, href }: { item: ServiceItem; href: string }) {
  return <article id={serviceAnchor(item)} className="card-ref group flex scroll-mt-24 flex-col overflow-hidden" data-testid={`card-service-${item.id}`}>
    <ImageFrame src={item.imageUrl} alt={`Illustration générée par IA : ${item.title}`} label="Illustration du soin" indicator={item.title} details={item.summary || item.description} className="h-52" />
    <div className="flex flex-1 flex-col p-6"><h3 className="font-display text-xl font-semibold text-[#073e53]">{item.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{item.summary || item.description}</p>
      <Link href={href} className="mt-5 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[.12em] text-accent transition-colors hover:text-[#073e53]" data-testid={`link-service-${item.id}`}>En savoir plus <ArrowRight size={14} /></Link></div>
  </article>;
}

function ReviewCard({ review }: { review: Testimonial }) {
  const stars = Math.max(0, Math.min(5, review.rating));
  return <article className="card-ref flex flex-col p-7" data-testid={`card-review-${review.id}`}>
    <Quote className="text-accent" size={22} />
    <p className="mt-4 flex-1 text-[15px] leading-7 text-foreground/85">« {review.quote} »</p>
    <div className="mt-6 flex items-center justify-between border-t border-border pt-4"><div><p className="text-sm font-semibold text-[#073e53]">{review.name}</p><p className="mt-1 text-[10px] uppercase tracking-[.16em] text-muted-foreground">{review.service}</p></div><span className="text-xs tracking-widest text-accent" aria-label={`${stars} sur 5`}>{'★'.repeat(stars)}</span></div>
  </article>;
}

function ReviewCarousel({ reviews, id = 'reviews' }: { reviews: Testimonial[]; id?: string }) {
  const [active, setActive] = useState(0);
  if (!reviews.length) return <EmptyInline title="Votre expérience compte" text="Les avis seront affichés ici lorsqu’ils seront disponibles." />;
  const move = (step: number) => setActive((current) => (current + step + reviews.length) % reviews.length);
  return <div className="mx-auto max-w-3xl" data-testid={`${id}-carousel`}>
    <div className="overflow-hidden px-1 py-2" aria-live="polite" aria-atomic="true">
      <ReviewCard key={reviews[active].id} review={reviews[active]} />
    </div>
    <div className="mt-5 flex items-center justify-between">
      <p className="text-xs font-medium tabular-nums text-muted-foreground" aria-label={`Témoignage ${active + 1} sur ${reviews.length}`}>{String(active + 1).padStart(2, '0')} <span className="mx-1 text-accent">/</span> {String(reviews.length).padStart(2, '0')}</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => move(-1)} aria-label="Témoignage précédent" className="grid h-10 w-10 place-items-center rounded-full border border-[#073e53]/20 text-[#073e53] transition-colors hover:bg-[#073e53] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b94f5b]" data-testid={`${id}-previous`}><ArrowLeft size={17} /></button>
        <button type="button" onClick={() => move(1)} aria-label="Témoignage suivant" className="grid h-10 w-10 place-items-center rounded-full border border-[#073e53]/20 text-[#073e53] transition-colors hover:bg-[#073e53] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b94f5b]" data-testid={`${id}-next`}><ArrowRight size={17} /></button>
      </div>
    </div>
  </div>;
}

function FaqList({ faqs }: { faqs: SiteContent['faqs'] }) {
  const [expanded, setExpanded] = useState<string | null>(faqs[0]?.id || null);
  return <div className="space-y-3">{faqs.map((faq) => <article key={faq.id} className="card-ref overflow-hidden" data-testid={`faq-item-${faq.id}`}>
    <button type="button" id={`faq-trigger-${faq.id}`} aria-controls={`faq-panel-${faq.id}`} aria-expanded={expanded === faq.id} onClick={() => setExpanded(expanded === faq.id ? null : faq.id)} className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#b94f5b]" data-testid={`button-faq-${faq.id}`}><span className="text-[15px] font-semibold text-[#073e53] md:text-base">{faq.question}</span><ChevronDown className={`shrink-0 text-accent transition-transform ${expanded === faq.id ? 'rotate-180' : ''}`} size={20} aria-hidden="true" /></button>
    <div id={`faq-panel-${faq.id}`} role="region" aria-labelledby={`faq-trigger-${faq.id}`} aria-hidden={expanded !== faq.id} className="faq-panel" data-open={expanded === faq.id}><div><p className="px-6 pb-6 text-sm leading-7 text-muted-foreground">{faq.answer}</p></div></div>
  </article>)}</div>;
}

function MetricCounter({ value, label }: { value: number; label: string }) {
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const node = document.getElementById(`metric-${label.replace(/\W/g, '')}`);
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      setDisplay(value);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setStarted(true);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [label, value]);
  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const duration = 850;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, value]);
  const nodeId = `metric-${label.replace(/\W/g, '')}`;
  return <div id={nodeId} className="border-l border-[#073e53]/15 pl-5 first:border-0 first:pl-0" aria-label={`${value} ${label}`}><p className="font-display text-3xl font-semibold tabular-nums text-[#073e53] md:text-4xl">{display}</p><p className="mt-1 text-[10px] uppercase tracking-[.14em] text-muted-foreground sm:text-[11px]">{label}</p></div>;
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
  const publicReviews = usePublicReviews();
  const testimonials = combinePublicReviews(publicReviews.data ?? [], content.testimonials);
  const lead = content.team[0];
  const photos = visibleGallery(content.gallery);
  const partnerLogo = content.gallery.find((item) => item.id === partnerLogoId);
  const partnerPhoto = content.gallery.find((item) => item.id === partnerPhotoId);
  const heroImg = hero.imageUrl?.trim();
  const isIllustrativeHero = heroImg === `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/cabinet-media/${heroIllustration.storagePath}`;
  return (
    <SiteShell clinic={clinic} overlay>
      <main>
        <section className="relative flex min-h-[92dvh] items-center overflow-hidden bg-[#073e53] text-white md:min-h-[100dvh]" data-testid="section-hero">
          {heroImg ? <img src={heroImg} alt={isIllustrativeHero ? heroIllustration.alt : heroImg === partnerPhoto?.imageUrl ? partnerPhoto.alt : 'Vue du cabinet dentaire'} fetchPriority="high" className={`absolute inset-0 h-full w-full object-cover ${isIllustrativeHero ? 'object-[100%_38%] md:object-[center_40%]' : 'object-center'}`} data-testid="img-hero" /> : <div aria-hidden className="hero-fallback absolute inset-0" />}
          <div aria-hidden className={`absolute inset-0 ${heroImg ? 'bg-[#070116]/60' : 'bg-[#070116]/15'}`} />
          <div className="relative z-10 mx-auto w-full max-w-[1240px] px-5 pb-20 pt-32 md:px-8">
            <div className="mx-auto max-w-[620px] reveal">
              {hero.eyebrow && <p className="mb-5 text-[11px] font-semibold uppercase tracking-[.26em] text-[#f0a0a6]">{hero.eyebrow}</p>}
              <h1 className="font-display text-[clamp(2.4rem,5.4vw,3.9rem)] font-semibold leading-[1.1]">{hero.title || 'Un sourire en confiance, un soin tout en douceur.'}</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/85">{hero.description || 'À Douala, nous avons imaginé un cabinet où chaque visite commence par une écoute attentive.'}</p>
              <div className="mt-9 flex flex-wrap gap-4">
                <BookButton clinic={clinic} testId="button-hero-book">{hero.primaryAction || 'Prendre rendez-vous'}</BookButton>
                <Link href="/soins" className="btn-outline-light" data-testid="link-hero-care">{hero.secondaryAction || 'Découvrir nos soins'}</Link>
              </div>
            </div>
          </div>
          {isIllustrativeHero && <p className="absolute bottom-4 left-5 z-10 max-w-[calc(100%-6rem)] text-[10px] leading-4 text-white/75 md:left-8">Illustration générée par IA — ne représente pas les locaux ni l’équipe réelle.</p>}
        </section>

        {[content.services.length, content.team.length, photos.length].some((count) => count > 0) && <section className="border-b border-[#073e53]/10 bg-[#f3f1f5] py-8 md:py-10" aria-label="Le cabinet en quelques repères">
          <div className="wrap flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:justify-start">
            {content.services.length > 0 && <MetricCounter value={content.services.length} label="Soins présentés" />}
            {content.team.length > 0 && <MetricCounter value={content.team.length} label="Membres de l’équipe" />}
            {photos.length > 0 && <MetricCounter value={photos.length} label="Images en galerie" />}
          </div>
        </section>}

        <section id="clinique-partenaire" className="section-pad bg-[#e6e3eb]" aria-labelledby="partner-heading">
          <div className="wrap grid items-center gap-8 md:grid-cols-[1fr_1.05fr] md:gap-12">
            <div className="overflow-hidden rounded-2xl">
              <ImageFrame src={partnerPhoto?.imageUrl || heroImg} alt="Façade de la Clinique La Bienveillance à Douala" label="Photo de l’établissement partenaire" indicator="Établissement partenaire" details="La façade du lieu qui accueille le cabinet à Douala." className="aspect-[4/3] w-full" />
            </div>
            <div className="rounded-2xl border border-[#073e53]/10 bg-white p-7 shadow-[0_18px_55px_rgba(7,1,22,.08)] md:p-10">
              {partnerLogo?.imageUrl && <img src={partnerLogo.imageUrl} alt={partnerLogo.alt || 'Logo de la Clinique La Bienveillance'} width="96" height="96" loading="lazy" className="mb-5 h-20 w-20 rounded-full bg-white object-contain ring-1 ring-[#073e53]/10" />}
              <p className="eyebrow">Établissement partenaire</p>
              <h2 id="partner-heading" className="mt-3 font-display text-3xl font-semibold leading-tight text-[#073e53] md:text-4xl">Le Cabinet Sourire Serein, au sein de La Bienveillance.</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">Le cabinet dentaire vous accueille au sein de la Clinique La Bienveillance, à Douala. Retrouvez les informations sur l’établissement partenaire et ses autres services sur son site officiel.</p>
              <p className="mt-4 text-sm font-medium text-[#073e53]">{clinic.address || 'Ancienne gare routière, Dakar, Douala, Cameroun'}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href={partnerSite} target="_blank" rel="noopener noreferrer" className="btn-navy" data-testid="link-partner-clinic">Visiter la Clinique La Bienveillance <ArrowRight size={15} /></a>
                <a href={clinic.mapUrl || mapsDirections} target="_blank" rel="noopener noreferrer" className="btn-teal" data-testid="link-partner-directions">Voir l’itinéraire <MapPin size={15} /></a>
              </div>
            </div>
          </div>
        </section>

        <section id="soins" className="section-pad bg-background">
          <div className="wrap">
            <SectionHead eyebrow="Nos soins" title="Prendre soin, avec justesse." text="Des soins pensés pour préserver votre santé et vous aider à vous sentir bien, tout simplement." />
            <p className="mt-4 max-w-3xl text-xs leading-5 text-muted-foreground">Les visuels des soins sont des illustrations générées par IA. Ils ne représentent ni les locaux ni l’équipe réelle.</p>
            {content.services.length ? <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{content.services.slice(0, 6).map((s) => <ServiceCard key={s.id} item={s} href={`/soins#${serviceAnchor(s)}`} />)}</div>
              : <EmptyInline title="Nos soins seront bientôt présentés ici" text="Les informations du cabinet seront mises à jour prochainement." />}
            <div className="mt-10 text-center"><ActionLink href="/soins" variant="navy" testId="link-home-all-services">Tous les soins</ActionLink></div>
          </div>
        </section>

        <section id="galerie" className="section-pad bg-[#e6e3eb]">
          <div className="wrap">
            <SectionHead eyebrow="Le cabinet" title="Un lieu pensé pour votre confort." text="Un aperçu de l’atmosphère qui vous attend." />
            {photos.length ? <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">{photos.slice(0, 6).map((p) => <figure key={p.id} className="overflow-hidden rounded-md" data-testid={`home-gallery-${p.id}`}><ImageFrame src={p.imageUrl} alt={p.alt} label="Photo du cabinet à ajouter" indicator={galleryCaption(p)} details={p.alt} className="aspect-[4/3] transition-transform duration-500 hover:scale-[1.03]" /><figcaption className="sr-only">{p.alt}</figcaption></figure>)}</div>
              : <EmptyInline title="L’espace se dévoilera bientôt" text="La galerie du cabinet est en préparation." />}
            <div className="mt-10 text-center"><ActionLink href="/galerie" variant="navy" testId="link-home-gallery">Voir la galerie</ActionLink></div>
          </div>
        </section>

        {lead && <section id="praticien" className="section-pad bg-background">
          <div className="wrap grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <ImageFrame src={lead?.imageUrl} alt={lead ? `Portrait de ${lead.name}` : 'Présentation de l’équipe'} label="Portrait à ajouter" indicator={lead?.name || 'Équipe du cabinet'} details={lead?.role || 'Présentation de l’équipe du cabinet.'} className="aspect-[4/5] w-full rounded-md md:max-h-[560px]" />
            <div>
              <SectionHead center={false} eyebrow={lead?.role || 'Votre praticien'} title={lead?.name || 'Une équipe, avant tout humaine.'} />
              <p className="mt-6 text-[15px] leading-7 text-muted-foreground">{lead?.biography || 'Nous sommes là pour vous accueillir tels que vous êtes et construire avec vous un parcours de soin qui a du sens.'}</p>
              <div className="mt-8"><ActionLink href="/equipe" testId="link-home-team">Rencontrer l’équipe</ActionLink></div>
            </div>
          </div>
        </section>}

        <section id="premiere-visite" className="section-pad bg-[#073e53] text-white">
          <div className="wrap">
            <div className="mx-auto max-w-2xl text-center"><p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#f0a0a6]">Votre première visite</p><h2 className="mt-3 font-display text-3xl font-semibold md:text-[2.6rem]">Comment se déroule un premier rendez-vous ?</h2><span className="mx-auto mt-5 block h-[2px] w-14 bg-[#f0a0a6]" /></div>
            <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{visitSteps.map((s) => <li key={s.n} className="rounded-md border border-white/12 bg-white/[.04] p-6" data-testid={`step-visit-${s.n}`}><span className="font-display text-3xl font-semibold text-[#f0a0a6]">0{s.n}</span><h3 className="mt-3 text-base font-semibold">{s.title}</h3><p className="mt-2 text-sm leading-6 text-white/70">{s.text}</p></li>)}</ol>
          </div>
        </section>

        <section id="avis" className="section-pad bg-[#e6e3eb]">
          <div className="wrap">
            <SectionHead eyebrow="Témoignages" title="La confiance se construit ensemble." />
            <ReviewCarousel reviews={testimonials.slice(0, 3)} id="home-reviews" />
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

        <section id="rendez-vous" className="bg-[#073e53] text-white">
          <div className="wrap grid gap-10 py-16 md:grid-cols-[1.2fr_1fr] md:items-center md:py-24">
            <div><p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#f0a0a6]">Prendre rendez-vous</p><h2 className="mt-3 font-display text-3xl font-semibold leading-tight md:text-[2.6rem]">Votre prochain rendez-vous peut être plus simple que vous ne le pensez.</h2><div className="mt-8 flex flex-wrap gap-4"><BookButton clinic={clinic} testId="button-home-final-book">Prendre rendez-vous</BookButton><Link href="/contact" className="btn-outline-light" data-testid="link-home-contact">Nous contacter</Link></div></div>
            <ul className="space-y-5 rounded-md border border-white/12 bg-white/[.04] p-7 text-sm">
              <li className="flex gap-4"><Phone size={18} className="mt-0.5 shrink-0 text-[#f0a0a6]" /><a href={`tel:${clinic.phone || ''}`} data-testid="link-home-phone">{clinic.phone || 'Téléphone à renseigner'}</a></li>
              <li className="flex gap-4"><MessageCircle size={18} className="mt-0.5 shrink-0 text-[#f0a0a6]" /><a href={`mailto:${clinic.email || ''}`} className="break-all" data-testid="link-home-email">{clinic.email || 'Courriel à renseigner'}</a></li>
              <li className="flex gap-4"><MapPin size={18} className="mt-0.5 shrink-0 text-[#f0a0a6]" /><span>{clinic.address || 'Douala, Cameroun'}</span></li>
              <li className="flex gap-4"><Clock3 size={18} className="mt-0.5 shrink-0 text-[#f0a0a6]" /><span className="whitespace-pre-line text-white/80">{clinic.openingHours || 'Horaires à renseigner'}</span></li>
            </ul>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}

export function ServicesPage({ content }: { content: SiteContent }) {
  const [location] = useLocation();
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(decodeURIComponent(hash))?.scrollIntoView({ block: 'start' });
  }, [location]);
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Des soins à votre mesure" title="La santé d’abord. Le confort, toujours." text="Nous prenons soin de votre sourire avec une approche préventive, des gestes précis et des explications qui vous ressemblent." />
    <section className="wrap section-pad">
      <p className="mb-8 max-w-3xl text-xs leading-5 text-muted-foreground">Les visuels des soins sont des illustrations générées par IA. Ils ne représentent ni les locaux ni l’équipe réelle du Cabinet Sourire Serein.</p>
      {content.services.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{content.services.map((s) => <ServiceCard key={s.id} item={s} href="/contact" />)}</div> : <EmptyInline title="La carte des soins se prépare" text="Revenez bientôt pour découvrir les soins proposés par le cabinet." />}
      <div className="mt-16 flex flex-col gap-6 rounded-md bg-[#073e53] p-8 text-white md:flex-row md:items-center md:justify-between md:p-10"><div><h2 className="font-display text-2xl font-semibold md:text-3xl">Une question avant de venir ?</h2><p className="mt-2 text-sm text-white/70">Nous sommes là pour vous orienter, sans engagement.</p></div><ActionLink href="/contact" testId="link-services-contact">Échanger avec nous</ActionLink></div>
    </section></main></SiteShell>;
}

export function TeamPage({ content }: { content: SiteContent }) {
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Derrière chaque sourire" title="Une équipe, avant tout humaine." text="Nous sommes là pour vous accueillir tels que vous êtes et construire avec vous un parcours de soin qui a du sens." />
    <section className="wrap section-pad">
      <figure className="mb-10 overflow-hidden rounded-2xl border border-[#073e53]/10 bg-white shadow-sm" data-testid="photo-clinic-team">
        <ImageFrame src={clinicPhotoUrl('clinic-team.jpg')} alt="Un groupe de professionnels de santé réuni dans les locaux de l’établissement partenaire." indicator="Équipe de santé" details="Un aperçu de l’équipe réunie dans l’établissement partenaire." className="aspect-[3/2] md:aspect-[16/8]" />
        <figcaption className="px-4 py-3 text-sm text-muted-foreground">L’équipe réunie dans l’établissement partenaire.</figcaption>
      </figure>
      {content.team.length ? <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{content.team.map((m) => <article key={m.id} className="card-ref overflow-hidden" data-testid={`card-team-${m.id}`}><ImageFrame src={m.imageUrl} alt={`Portrait de ${m.name}`} label="Portrait à ajouter" indicator={m.name} details={m.role} className="aspect-[4/5]" /><div className="p-6"><p className="eyebrow">{m.role}</p><h2 className="mt-2 font-display text-2xl font-semibold text-[#073e53]">{m.name}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{m.biography}</p></div></article>)}</div> : <EmptyInline title="Faisons connaissance bientôt" text="Les portraits et présentations de l’équipe seront publiés ici." />}
    </section></main></SiteShell>;
}

export function GalleryPage({ content }: { content: SiteContent }) {
  const photos = visibleGallery(content.gallery);
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Le cabinet en images" title="Un lieu pensé pour votre confort." text="Retrouvez les visuels officiels du lieu qui accueille le cabinet dentaire." />
    <section className="wrap section-pad">
      <p className="mb-8 max-w-3xl text-xs leading-5 text-muted-foreground">Cette galerie réunit des photos fournies par l’établissement partenaire et, pour certains soins, des illustrations générées par IA qui ne représentent pas les locaux ni l’équipe réelle.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {clinicGalleryPhotos.map((photo) => <figure key={photo.id} className="overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/5" data-testid={`gallery-image-${photo.id}`}>
          <ImageFrame src={photo.src} alt={photo.alt} label="Photo du cabinet ou de l’établissement partenaire" indicator={photo.caption} details={photo.alt} className="aspect-[4/3]" />
          <figcaption className="px-3 py-2 text-xs font-medium text-[#073e53] md:px-4 md:py-3 md:text-sm">{photo.caption}</figcaption>
        </figure>)}
        {photos.map((photo) => <figure key={photo.id} className="overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/5" data-testid={`gallery-image-${photo.id}`}>
          <ImageFrame src={photo.imageUrl} alt={photo.alt} label="Illustration de l’activité" indicator={galleryCaption(photo)} details={photo.alt} className="aspect-[4/3]" />
          <figcaption className="px-3 py-2 text-xs font-medium text-[#073e53] md:px-4 md:py-3 md:text-sm">{galleryCaption(photo)}</figcaption>
        </figure>)}
      </div>
    </section></main></SiteShell>;
}

export function ReviewsPage({ content }: { content: SiteContent }) {
  const publicReviews = usePublicReviews();
  const testimonials = combinePublicReviews(publicReviews.data ?? [], content.testimonials);
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Vos mots comptent" title="La confiance se construit ensemble." text="Découvrez les expériences partagées par les visiteurs du cabinet. Votre retour nous aide à mieux vous accueillir." />
    <section className="wrap section-pad">
      {publicReviews.isError && <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm" role="alert" data-testid="status-public-reviews-error">
        <p>Les avis visiteurs ne sont pas disponibles pour le moment. Les témoignages du cabinet restent affichés.</p>
        <button type="button" onClick={() => void publicReviews.refetch()} className="mt-2 font-semibold text-destructive underline" data-testid="button-retry-public-reviews">Réessayer</button>
      </div>}
      {publicReviews.isLoading && <p className="mb-6 text-center text-sm text-muted-foreground" role="status" data-testid="status-public-reviews-loading">Chargement des avis…</p>}
      <ReviewCarousel reviews={testimonials} id="reviews-page" />
      <div className="mx-auto mt-14 max-w-3xl border-t border-border pt-12">
        <ReviewSubmissionForm />
      </div>
      <div className="mt-12 text-center"><ActionLink href="/contact" testId="link-reviews-contact">Nous contacter</ActionLink></div>
    </section></main></SiteShell>;
}

export function FAQPage({ content }: { content: SiteContent }) {
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Questions fréquentes" title="Les réponses, sans détour." text="Vous préparer à votre visite, c’est déjà prendre soin de vous. Voici les réponses aux questions que l’on nous pose souvent." />
    <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">{content.faqs.length ? <FaqList faqs={content.faqs} /> : <EmptyInline title="Une question particulière ?" text="Contactez-nous, nous serons heureux de vous répondre." />}
      <div className="mt-12 rounded-md bg-[#073e53] p-8 text-white"><h2 className="font-display text-2xl font-semibold">Votre question n’est pas ici ?</h2><p className="mt-2 text-sm text-white/70">Notre équipe est à votre écoute.</p><div className="mt-5"><ActionLink href="/contact" testId="link-faq-contact">Nous contacter</ActionLink></div></div>
    </section></main></SiteShell>;
}

const blogImageAlt: Record<string, string> = {
  'urgence-dentaire-douala': 'Illustration d’un examen dentaire lié à une douleur dentaire.',
  'detartrage-et-polissage': 'Illustration d’un soin d’hygiène dentaire et de détartrage.',
  'kinesitherapie-maxillo-faciale': 'Illustration d’un exercice de mobilité maxillo-faciale.',
  'grossesse-et-sante-bucco-dentaire': 'Illustration d’une consultation en maternité au sujet de la santé bucco-dentaire.',
};
const articleImageAlt = (post: BlogPost) => blogImageAlt[post.id] || `Illustration dentaire liée à l’article : ${post.title}`;

function BlogCard({ post }: { post: BlogPost }) {
  return <article className="card-ref overflow-hidden" data-testid={`card-blog-${post.id}`}><Link href={`/blog/${post.slug}/`} className="block" data-testid={`link-blog-${post.slug}`}><ImageFrame src={post.imageUrl} alt={articleImageAlt(post)} label="Illustration de l’article" indicator={post.title} details={post.excerpt} className="h-52" /><div className="p-6"><p className="text-[10px] uppercase tracking-[.16em] text-accent">{post.date} · {post.author}</p><h2 className="mt-3 font-display text-xl font-semibold leading-snug text-[#073e53]">{post.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{post.excerpt}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-accent">Lire l’article <ArrowRight size={14} /></span></div></Link></article>;
}

export function BlogPage({ content }: { content: SiteContent }) {
  const posts = content.blogPosts.filter((p) => p.published);
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Conseils dentaires à Douala" title="Quelques repères pour votre sourire." text="Des informations générales sur les soins dentaires et la santé bucco-dentaire, à compléter par les conseils de votre praticien." />
    <section className="wrap section-pad">{posts.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{posts.map((p) => <BlogCard key={p.id} post={p} />)}</div> : <EmptyInline title="Le carnet prend forme" text="Nos premiers conseils et articles seront publiés prochainement." />}</section></main></SiteShell>;
}

export function BlogArticlePage({ content, slug }: { content: SiteContent; slug?: string }) {
  const post = content.blogPosts.find((c) => c.slug === slug && c.published);
  if (!post) return <SiteShell clinic={content.clinic}><main className="mx-auto max-w-3xl px-5 py-24 text-center"><p className="eyebrow">Article introuvable</p><h1 className="mt-4 font-display text-4xl font-semibold text-[#073e53]">Ce carnet n’a pas encore cette page.</h1><div className="mt-7"><ActionLink href="/blog" testId="link-article-back">Retour au carnet</ActionLink></div></main></SiteShell>;
  const blocks = post.content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return <SiteShell clinic={content.clinic}><main><article className="mx-auto max-w-4xl px-5 pb-24 pt-12 md:px-8 md:pt-16"><Link href="/blog/" className="inline-flex items-center gap-2 text-xs font-semibold text-accent" data-testid="link-back-blog"><ArrowLeft size={14} /> Tous les articles</Link><p className="mt-10 text-[10px] uppercase tracking-[.2em] text-accent">{post.date} · {post.author}</p><h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-[#073e53] md:text-5xl">{post.title}</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{post.excerpt}</p><ImageFrame src={post.imageUrl} alt={articleImageAlt(post)} label="Illustration de l’article" indicator="Conseil dentaire" details={post.title} className="mt-10 h-[280px] rounded-md md:h-[440px]" priority /><div className="prose prose-lg mt-10 max-w-none font-sans leading-8 text-foreground/80">{blocks.map((block, index) => block.startsWith('## ') ? <h2 key={index}>{block.slice(3)}</h2> : <p key={index}>{block}</p>)}</div></article></main></SiteShell>;
}

function CampaignGrid({ campaigns }: { campaigns: Campaign[] }) {
  return <div className="grid gap-6 md:grid-cols-2">{campaigns.map((c) => {
    const videoUrl = c.videoUrl?.trim();
    const hasVideo = c.mediaType === 'video' && !!videoUrl;
    return <article key={c.id} className="card-ref overflow-hidden" data-testid={`card-campaign-${c.id}`}>
      <div className="relative">
        {hasVideo
          ? <VideoPlayer
            src={videoUrl}
            poster={c.imageUrl?.trim() || undefined}
            title={`Vidéo de la campagne : ${c.title}`}
            className="h-60"
            testId={`video-campaign-${c.id}`}
          />
          : <ImageFrame src={c.imageUrl} alt={c.title} label={c.mediaType === 'video' ? 'Miniature vidéo à ajouter' : 'Visuel à ajouter'} indicator={c.title} details={c.description} className="h-60" />}
      </div>
      <div className="p-6">
        <h2 className="font-display text-xl font-semibold text-[#073e53]">{c.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.description}</p>
      </div>
    </article>;
  })}</div>;
}

export function InformationPage({ content }: { content: SiteContent }) {
  const campaigns = content.campaigns.filter((c) => c.active);
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Informations du cabinet" title="Les nouvelles de la maison." text="Campagnes, actualités et informations utiles partagées par l’équipe du cabinet." /><section className="wrap section-pad">{campaigns.length ? <CampaignGrid campaigns={campaigns} /> : <EmptyInline title="Rien de nouveau pour le moment" text="Les informations utiles seront partagées ici dès qu’elles seront disponibles." />}</section></main></SiteShell>;
}

export function ContactPage({ content }: { content: SiteContent }) {
  const clinic = content.clinic;
  const row = (icon: ReactNode, label: string, value: ReactNode) => <><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white/10 text-[#f0a0a6]">{icon}</span><span><b className="block font-semibold">{label}</b><span className="mt-1 block whitespace-pre-line text-white/70">{value}</span></span></>;
  return <SiteShell clinic={clinic}><main><PageIntro eyebrow="Prenons le temps d’échanger" title="Nous sommes tout près." text="Un rendez-vous, une question, un besoin d’orientation ? Contactez-nous comme vous le souhaitez." />
    <section className="wrap section-pad grid gap-7 md:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-md bg-[#073e53] p-7 text-white md:p-10"><p className="text-[11px] uppercase tracking-[.24em] text-[#f0a0a6]">{safeName(clinic.name)} · {safeCity(clinic.city)}</p><h2 className="mt-4 font-display text-3xl font-semibold">À votre écoute.</h2><div className="mt-8 space-y-6 text-sm">
        <a href={`tel:${clinic.phone}`} className="flex items-start gap-4" data-testid="link-contact-phone">{row(<Phone size={17} />, 'Téléphone', clinic.phone || 'À renseigner')}</a>
        <a href={`mailto:${clinic.email}`} className="flex items-start gap-4" data-testid="link-contact-email">{row(<MessageCircle size={17} />, 'Courriel', clinic.email || 'À renseigner')}</a>
        <div className="flex items-start gap-4" data-testid="text-contact-address">{row(<MapPin size={17} />, 'Adresse', clinic.address || 'Douala, Cameroun')}</div>
        <div className="flex items-start gap-4" data-testid="text-contact-hours">{row(<Clock3 size={17} />, 'Horaires', clinic.openingHours || 'À renseigner')}</div>
      </div><div className="mt-9"><BookButton clinic={clinic} testId="button-contact-book">Demander un rendez-vous</BookButton></div></div>
      <div className="card-ref p-6 md:p-9">
        <p className="eyebrow">À votre rythme</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-[#073e53] md:text-3xl">Faire une demande de rendez-vous</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">L’équipe vous recontactera pour convenir d’un créneau adapté.</p>
        <AppointmentRequestForm phone={clinic.phone} />
      </div>
    </section>
    <section className="wrap pb-16">
      <div className="card-ref flex min-h-[280px] flex-col overflow-hidden">
        <iframe title="Carte pour rejoindre la Clinique La Bienveillance à Douala" src={mapEmbedUrl} loading="lazy" className="h-[360px] w-full border-0" referrerPolicy="no-referrer-when-downgrade" data-testid="map-contact" />
        <div className="flex flex-wrap items-center justify-between gap-3 p-4"><p className="text-xs text-muted-foreground">Ancienne gare routière, Dakar, Douala, Cameroun</p><a href={clinic.mapUrl || mapsDirections} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-semibold text-[#073e53] hover:underline" data-testid="link-contact-directions">Ouvrir dans Google Maps <ArrowRight size={14} /></a></div>
      </div>
    </section>
  </main></SiteShell>;
}
