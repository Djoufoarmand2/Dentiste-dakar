import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, ChevronDown, Clock3, Image as ImageIcon, Link2, Linkedin, Mail, MapPin, Menu,
  MessageCircle, Phone, Quote, X,
} from 'lucide-react';
import type { BlogPost, Campaign, ServiceItem, SiteContent, SocialLink, Testimonial } from '@workspace/api-client-react';
import { SiFacebook, SiInstagram, SiSnapchat, SiTiktok, SiWhatsapp, SiX, SiYoutube } from 'react-icons/si';
import { Link, useLocation } from 'wouter';
import { AppointmentRequestForm } from './appointment-request-form';
import { QuickContactForm } from './quick-contact-form';
import { ManualContactLinks } from './manual-contact-links';
import { ReviewSubmissionForm } from './review-submission-form';
import { RelatedPages, ReviewTrustPanel } from './review-trust';
import { VideoPlayer } from './video-player';
import { getYouTubeThumbnailUrl } from '@/lib/video-url';
import { PRACTICE_CONTACT_EMAIL } from '@/lib/contact-info';
import { ServiceDetailContent as ServiceDetailBody, WhyChooseContent as WhyChooseBody } from './patient-content-pages';
import { combinePublicReviews, usePublicReviews } from '@/lib/reviews';
import { summarizePublishedReviews } from '@/lib/review-summary';
import heroIllustration from '@/lib/hero-illustration.json';
import clinicFaqs from '@/data/clinic-faqs.json';
import { supabaseUrl } from '@/lib/supabase';
import { localizedPath, useSiteLocale } from '@/lib/site-locale';
import { englishBlogPost, englishFaq, englishService } from '@/lib/cms-translations';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

const navItemsFr = [
  ['Soins', '/soins'], ['Pourquoi nous choisir', '/pourquoi-nous-choisir'], ['Notre équipe', '/equipe'], ['Le cabinet', '/galerie'],
  ['Avis', '/avis'], ['Conseils', '/blog/'], ['FAQ', '/faq'],
] as const;
const navItemsEn = [
  ['Services', '/soins'], ['Why choose us', '/pourquoi-nous-choisir'], ['Our team', '/equipe'], ['The practice', '/galerie'],
  ['Reviews', '/avis'], ['Advice', '/blog/'], ['FAQ', '/faq'],
] as const;
const uiText = (locale: 'fr' | 'en', fr: string, en: string) => locale === 'en' ? en : fr;
const cmsText = (locale: 'fr' | 'en', fr?: string, en?: string) =>
  locale === 'fr' ? fr?.trim() || '' : en?.trim() || 'English translation not yet available.';
const faqsForDisplay = (faqs: SiteContent['faqs']) => {
  if (!import.meta.env.DEV) return faqs;
  const existingIds = new Set(faqs.map((faq) => faq.id));
  const previewFaqs = clinicFaqs.filter((faq) => !existingIds.has(faq.id));
  return [...previewFaqs, ...faqs];
};
const routeFor = (href: string, locale: 'fr' | 'en', content?: SiteContent) => localizedPath(href, locale, content);
const confirmedHoursFr = 'Du lundi au vendredi · 16h00–19h00 (sur rendez-vous)\nSamedi · 10h00–14h00 (sur rendez-vous)';
const confirmedHoursEn = 'Monday to Friday · 4:00–7:00 pm (by appointment)\nSaturday · 10:00 am–2:00 pm (by appointment)';
const isLegacyHours = (value: string) =>
  /8\s*h\s*[–-]\s*17\s*h|24\s*h.*24.*7\s*j.*7|24\s*hours?.*7\s*days?/i.test(value);

const partnerLogoId = 'partner-clinique-la-bienveillance-logo';
const partnerPhotoId = 'photo-clinique-la-bienveillance';
const partnerSite = 'https://cliniquelabienveillance.com';
const mapsDirections = 'https://www.google.com/maps/place/Clinique+La+Bienveillance/@4.0307524,9.7258638,17z/data=!4m6!3m5!1s0x10610d2ffb339343:0xcc207a6138777c30!8m2!3d4.0307524!4d9.7307347!16s%2Fg%2F11fltnv9l8';
const mapEmbedUrl = 'https://maps.google.com/maps?q=4.0307524%2C9.7307347&z=17&output=embed';

function PlatformIcon({ platform, size = 18 }: { platform: SocialLink['platform']; size?: number }) {
  switch (platform) {
    case 'facebook': return <SiFacebook size={size} aria-hidden="true" />;
    case 'instagram': return <SiInstagram size={size} aria-hidden="true" />;
    case 'snapchat': return <SiSnapchat size={size} aria-hidden="true" />;
    case 'tiktok': return <SiTiktok size={size} aria-hidden="true" />;
    case 'youtube': return <SiYoutube size={size} aria-hidden="true" />;
    case 'linkedin': return <Linkedin size={size} aria-hidden="true" />;
    case 'x': return <SiX size={size} aria-hidden="true" />;
    case 'whatsapp': return <SiWhatsapp size={size} aria-hidden="true" />;
    default: return <Link2 size={size} aria-hidden="true" />;
  }
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function safeLogoUrl(value?: string) {
  if (!value?.trim()) return undefined;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

const contactSocialPlatforms = [
  { platform: 'facebook', label: 'Facebook' },
  { platform: 'instagram', label: 'Instagram' },
  { platform: 'tiktok', label: 'TikTok' },
  { platform: 'snapchat', label: 'Snapchat' },
] as const;

function SocialLinks({ links, className = '', variant = 'footer' }: { links?: SocialLink[]; className?: string; variant?: 'footer' | 'contact' }) {
  const locale = useSiteLocale();
  const validLinks = (links ?? []).flatMap((link) => {
    const href = safeExternalUrl(link.url);
    return href ? [{ ...link, href }] : [];
  });
  if (!validLinks.length && variant !== 'contact') return null;
  if (variant === 'contact') {
    const configuredPlatforms = new Set(validLinks.map((link) => link.platform));
    const placeholders = contactSocialPlatforms.filter((item) => !configuredPlatforms.has(item.platform));
    return <nav aria-label={uiText(locale, 'Réseaux sociaux', 'Social networks')} className={className} data-testid="social-links-contact">
    <ul className="grid gap-2">
      {validLinks.map((link, index) => {
        const logo = safeLogoUrl(link.logoUrl);
        return <li key={link.id} style={{ animation: `social-link-in 420ms ${index * 65}ms both` }}>
          <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} · ${uiText(locale, 'Ouvre dans un nouvel onglet', 'opens in a new tab')}`} title={link.label} className="group flex min-h-12 items-center gap-3 rounded-md border border-[#073e53]/10 bg-[#fbfaf7] px-4 text-sm font-medium text-[#18365f] shadow-[0_3px_12px_rgba(24,54,95,.03)] transition duration-200 hover:-translate-y-0.5 hover:border-[#b5965a]/60 hover:bg-white hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b5965a] motion-reduce:transform-none motion-reduce:transition-none" data-testid={`link-social-${link.id}`}>
            <span className="grid h-7 w-7 shrink-0 place-items-center text-[#8b7141] transition-transform duration-200 group-hover:scale-110 motion-reduce:transform-none">
              {logo ? <img src={logo} alt={link.imageAlt?.trim() || ''} loading="lazy" className="h-5 w-5 object-contain" /> : <PlatformIcon platform={link.platform} size={17} />}
            </span>
            <span>{link.label}</span>
            <ArrowRight size={14} aria-hidden="true" className="ml-auto text-[#8b7141] opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100 motion-reduce:transform-none motion-reduce:transition-none" />
          </a>
        </li>;
      })}
      {placeholders.map((item, index) => (
        <li key={`social-placeholder-${item.platform}`} style={{ animation: `social-link-in 420ms ${(validLinks.length + index) * 65}ms both` }}>
          <div aria-disabled="true" className="flex min-h-12 items-center gap-3 rounded-md border border-[#073e53]/10 bg-[#fbfaf7] px-4 text-sm font-medium text-[#18365f]" data-testid={`placeholder-social-${item.platform}`}>
            <span className="grid h-7 w-7 shrink-0 place-items-center text-[#8b7141]">
              <PlatformIcon platform={item.platform} size={17} />
            </span>
            <span>{item.label}</span>
            <span className="ml-auto text-[10px] font-normal text-muted-foreground">{uiText(locale, 'À configurer', 'To be added')}</span>
          </div>
        </li>
      ))}
    </ul>
    <style>{`@keyframes social-link-in { from { opacity: 0; transform: translateY(7px) } to { opacity: 1; transform: translateY(0) } } @media (prefers-reduced-motion: reduce) { [data-testid="social-links-contact"] li { animation: none !important; } }`}</style>
    </nav>;
  }
  return <nav aria-label={uiText(locale, 'Réseaux sociaux', 'Social networks')} className={className} data-testid="social-links">
    <ul className="flex flex-wrap items-center gap-2">
      {validLinks.map((link) => {
        const logo = safeLogoUrl(link.logoUrl);
        return <li key={link.id}>
          <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} · ${uiText(locale, 'Ouvre dans un nouvel onglet', 'opens in a new tab')}`} title={link.label} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 px-3 text-xs text-white/85 transition-colors hover:border-white/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" data-testid={`link-social-${link.id}`}>
            {logo ? <img src={logo} alt={link.imageAlt?.trim() || ''} loading="lazy" className="h-4 w-4 object-contain" /> : <PlatformIcon platform={link.platform} size={16} />}
            <span>{link.label}</span>
          </a>
        </li>;
      })}
    </ul>
  </nav>;
}

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
const visibleTeamMembers = (team: SiteContent['team']) => team.filter((member) =>
  !/fictif|fictive|à remplacer|à renseigner|exemple de contenu/i.test(`${member.name} ${member.role} ${member.biography}`));
const galleryCaption = (item: SiteContent['gallery'][number], locale: 'fr' | 'en' = 'fr') => {
  const captionsFr: Record<string, string> = {
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
  const captionsEn: Record<string, string> = {
    'photo-clinique-la-bienveillance': 'Exterior of Clinique La Bienveillance',
    'illustration-consultation-dentaire': 'Dental consultation',
    'illustration-detartrage-polissage': 'Scaling and polishing',
    'illustration-traitement-caries': 'Cavity treatment',
    'illustration-plombage-composite': 'Filling and composite',
    'illustration-kinesitherapie-maxillo-faciale': 'Maxillofacial physiotherapy',
    'illustration-laboratoire-prothetique': 'Prosthetics laboratory',
    'illustration-chirurgie-dentaire': 'Dental surgery',
    'illustration-maternite-clinique-bienveillance': 'Maternity · Clinique La Bienveillance',
  };
  return (locale === 'en' ? captionsEn : captionsFr)[item.id] || cmsText(locale, item.alt, item.altEn);
};

const bookHref = (clinic: SiteContent['clinic']) => clinic.bookingUrl || `tel:${clinic.phone || ''}`;
const hoursLabel = (clinic: SiteContent['clinic'], locale: 'fr' | 'en') => {
  const frenchHours = clinic.openingHours?.trim() || '';
  const englishHours = clinic.openingHoursEn?.trim() || '';
  const legacyFrench = isLegacyHours(frenchHours);
  const legacyEnglish = isLegacyHours(englishHours);
  if (locale === 'en') {
    if (englishHours && !legacyEnglish) return englishHours;
    if (!frenchHours || legacyFrench || legacyEnglish) return confirmedHoursEn;
    return `Practice hours (provided in French): ${frenchHours}`;
  }
  return frenchHours && !legacyFrench ? frenchHours : confirmedHoursFr;
};

export function LogoWordmark({ clinic, inverse = false }: { clinic?: SiteContent['clinic']; inverse?: boolean }) {
  const locale = useSiteLocale();
  const homeHref = locale === 'en' ? '/en' : '/';
  return <Link href={homeHref} className={`brand-wordmark inline-flex shrink-0 items-center gap-3 ${inverse ? 'text-[#ffffff]' : 'text-foreground'}`} data-testid="link-home-brand">
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
  const locale = useSiteLocale();
  return <Link href={locale === 'en' ? '/en' : '/'} className="brand-wordmark inline-flex shrink-0 items-center gap-3 text-white" data-testid="link-footer-brand">
    <span className="brand-mark-frame" aria-hidden="true">
      <img src={clinic?.logoUrl?.trim() || brandMarkUrl} alt="" width="64" height="48" className="brand-mark-image" />
    </span>
    <span className="flex flex-col leading-none">
      <span className="whitespace-nowrap font-display text-[20px] font-semibold">{safeName(clinic?.name)}</span>
      <span className="mt-1 text-[9px] uppercase tracking-[.2em] text-white/65">{uiText(locale, 'Cabinet dentaire', 'Dental practice')} · {safeCity(clinic?.city)}</span>
    </span>
  </Link>;
}

export function Header({ clinic, content, overlay = false }: { clinic?: SiteContent['clinic']; content?: SiteContent; overlay?: boolean }) {
  const locale = useSiteLocale();
  const [location] = useLocation();
  const navItems = locale === 'en' ? navItemsEn : navItemsFr;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lightHeader = !overlay || scrolled;
  const navColor = `text-[13px] font-medium transition-colors hover:text-[#b94f5b] ${lightHeader ? 'text-[#073e53]' : 'text-white/90'}`;
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return <header className={`public-header ${overlay ? `home-header ${scrolled ? 'is-scrolled' : ''}` : ''} ${lightHeader ? 'header-light' : 'header-transparent'}`}>
    <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-5 py-4 md:px-8">
      <LogoWordmark clinic={clinic} inverse={!lightHeader} />
      <nav aria-label={uiText(locale, 'Navigation principale', 'Main navigation')} className="hidden items-center gap-3 xl:flex">
        <Link href={locale === 'en' ? '/en' : '/'} className={`whitespace-nowrap text-[13px] font-medium transition-colors hover:text-[#b94f5b] ${lightHeader ? 'text-[#073e53]' : 'text-white/90'}`} data-testid="nav-accueil">{uiText(locale, 'Accueil', 'Home')}</Link>
        {navItems.map(([label, href]) => <Link key={href} href={routeFor(href, locale, content)} className={`whitespace-nowrap text-[13px] font-medium transition-colors hover:text-[#b94f5b] ${lightHeader ? 'text-[#073e53]' : 'text-white/90'}`} data-testid={`nav-${href.slice(1)}`}>{label}</Link>)}
        <Link href={routeFor('/informations', locale)} className={`${navColor} whitespace-nowrap`} data-testid="nav-informations">{uiText(locale, 'Informations', 'Updates')}</Link>
      </nav>
      <div className="hidden items-center gap-5 xl:flex">
        <Link href={localizedPath(location, locale === 'en' ? 'fr' : 'en', content)} lang={locale === 'en' ? 'fr' : 'en'} className={`text-xs font-semibold underline-offset-4 hover:underline ${lightHeader ? 'text-[#073e53]' : 'text-white'}`} data-testid="link-language-switch">{locale === 'en' ? 'Français' : 'English'}</Link>
        <Link href={routeFor('/contact', locale)} className="btn-gold whitespace-nowrap" data-testid="button-header-rendez-vous">{uiText(locale, 'Prendre rendez-vous', 'Request an appointment')} <ArrowRight size={15} /></Link>
      </div>
      <button type="button" aria-label={open ? uiText(locale, 'Fermer le menu', 'Close menu') : uiText(locale, 'Ouvrir le menu', 'Open menu')} aria-expanded={open} onClick={() => setOpen(!open)} className={`grid h-10 w-10 place-items-center rounded-md border xl:hidden ${lightHeader ? 'border-[#073e53]/25 text-[#073e53]' : 'border-white/30 text-white'}`} data-testid="button-menu-mobile">{open ? <X size={19} /> : <Menu size={19} />}</button>
    </div>
    {open && <nav aria-label={uiText(locale, 'Navigation mobile', 'Mobile navigation')} className={`absolute inset-x-0 top-full px-5 pb-6 pt-1 shadow-xl xl:hidden ${lightHeader ? 'bg-white' : 'bg-[#073e53]'}`}>
      {[[uiText(locale, 'Accueil', 'Home'), locale === 'en' ? '/en' : '/'] as const, ...navItems, [uiText(locale, 'Informations', 'Updates'), '/informations'] as const, [uiText(locale, 'Contact', 'Contact'), '/contact'] as const].map(([label, href]) => <Link onClick={() => setOpen(false)} key={href} href={href === (locale === 'en' ? '/en' : '/') ? href : routeFor(href, locale)} className={`block border-t py-3 text-sm ${lightHeader ? 'border-[#073e53]/10 text-[#073e53]' : 'border-white/10 text-white/90'}`} data-testid={`mobile-nav-${href.slice(1) || 'accueil'}`}>{label}</Link>)}
      <Link href={localizedPath(location, locale === 'en' ? 'fr' : 'en', content)} lang={locale === 'en' ? 'fr' : 'en'} onClick={() => setOpen(false)} className={`block border-t py-3 text-sm ${lightHeader ? 'border-[#073e53]/10 text-[#073e53]' : 'border-white/10 text-white/90'}`} data-testid="mobile-link-language-switch">{locale === 'en' ? 'Français' : 'English'}</Link>
      <Link href={routeFor('/contact', locale)} onClick={() => setOpen(false)} className="btn-gold mt-4 w-full justify-center" data-testid="mobile-button-rendez-vous">{uiText(locale, 'Prendre rendez-vous', 'Request an appointment')} <ArrowRight size={15} /></Link>
    </nav>}
  </header>;
}

export function Footer({ clinic, content }: { clinic?: SiteContent['clinic']; content?: SiteContent }) {
  const locale = useSiteLocale();
  const navItems = locale === 'en' ? navItemsEn : navItemsFr;
  const [location] = useLocation();
  return <footer className="bg-[#070116] text-[#ffffff]">
    <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 md:grid-cols-[1.2fr_.8fr_.8fr_.9fr] md:px-8 lg:py-16">
      <div><BrandLockup clinic={clinic} /><p className="mt-5 max-w-sm text-sm leading-7 text-white/65">{uiText(locale, 'Un lieu de soin où l’on prend le temps de vous écouter, de vous expliquer et de vous accompagner.', 'A place for care where we take time to listen, explain and support you.')}</p></div>
      <div><p className="footer-title">{uiText(locale, 'Navigation', 'Explore')}</p><ul className="space-y-2 text-sm text-white/70">{navItems.map(([label, href]) => <li key={href}><Link href={routeFor(href, locale, content)} className="hover:text-[#f0a0a6]" data-testid={`footer-nav-${href.slice(1)}`}>{label}</Link></li>)}<li><Link href={routeFor('/informations', locale)} className="hover:text-[#f0a0a6]" data-testid="footer-nav-informations">{uiText(locale, 'Informations', 'Updates')}</Link></li><li><Link href={routeFor('/confidentialite', locale)} className="hover:text-[#f0a0a6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" data-testid="footer-nav-confidentialite">{uiText(locale, 'Confidentialité', 'Privacy')}</Link></li></ul></div>
      <div><p className="footer-title">{uiText(locale, 'Nous trouver', 'Find us')}</p><p className="text-sm leading-7 text-white/70">{clinic?.address ? (locale === 'en' ? `Address supplied by the practice (not translated): ${clinic.address}` : clinic.address) : uiText(locale, 'Douala, Cameroun', 'Douala, Cameroon')}<br />{safeCity(clinic?.city)}</p><a href={clinic?.mapUrl || mapsDirections} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs text-[#f0a0a6] hover:text-white" data-testid="link-footer-map">{uiText(locale, 'Itinéraire', 'Directions')} <ArrowRight size={14} /></a><a href={partnerSite} target="_blank" rel="noopener noreferrer" className="mt-3 block text-xs text-white/60 hover:text-white">{uiText(locale, 'Établissement partenaire : La Bienveillance', 'Partner clinic: La Bienveillance')}</a></div>
      <div><p className="footer-title">{uiText(locale, 'Contact', 'Contact')}</p><a href={`tel:${clinic?.phone || ''}`} className="block text-base font-medium" data-testid="link-footer-phone">{clinic?.phone || uiText(locale, 'Contactez-nous', 'Contact us')}</a><a href={`mailto:${PRACTICE_CONTACT_EMAIL}`} className="mt-2 block text-sm text-white/70" data-testid="link-footer-email">{PRACTICE_CONTACT_EMAIL}</a><ManualContactLinks phone={clinic?.phone} tone="dark" className="mt-4" /><p className="mt-4 whitespace-pre-line text-xs leading-6 text-white/60">{clinic ? hoursLabel(clinic, locale) : uiText(locale, 'Horaires à renseigner', 'Practice hours to be added')}</p><SocialLinks links={content?.socialLinks} className="mt-5" /></div>
    </div>
    <div className="border-t border-white/10">
      <div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-3 px-5 py-5 text-[11px] text-white/75 sm:flex-row sm:flex-wrap sm:items-center md:px-8">
        <span>© {new Date().getFullYear()} {safeName(clinic?.name)} · Douala</span>
        <span>{uiText(locale, 'Une présence attentive, un sourire à la fois.', 'Attentive care, one smile at a time.')}</span>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] py-1 pl-1 pr-3 text-white/80">
          <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-[#1587bd] to-[#16b7a8] text-[9px] font-black tracking-[-0.08em] text-white shadow-sm">DJ</span>
          <span>{uiText(locale, 'Site réalisé par', 'Website by')} <strong className="font-semibold text-white">DJ Corporation</strong></span>
        </span>
        <Link href={localizedPath(location, locale === 'en' ? 'fr' : 'en', content)} lang={locale === 'en' ? 'fr' : 'en'} className="underline underline-offset-4">{locale === 'en' ? 'Français' : 'English'}</Link>
      </div>
    </div>
  </footer>;
}

function AnnouncementBar({ clinic }: { clinic?: SiteContent['clinic'] }) {
  const locale = useSiteLocale();
  const hasHours = Boolean(clinic);
  const hours = clinic ? hoursLabel(clinic, locale).replace(/\s*\n\s*/g, ' · ') : '';
  const message = hasHours
    ? `${uiText(locale, 'Horaires du cabinet', 'Practice hours')}: ${hours}`
    : uiText(locale, 'Pour un rendez-vous, contactez le cabinet ou envoyez une demande en ligne.', 'For an appointment, contact the practice or send a request online.');
  return <div className="announcement-bar" role="region" aria-label={uiText(locale, 'Informations du cabinet', 'Practice information')} data-testid="announcement-hours">
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
  const locale = useSiteLocale();
  const phoneDigits = clinic?.phone?.replace(/\D/g, '') || '237677873442';
  return <>
    <a
      href={`https://wa.me/${phoneDigits}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={uiText(locale, `Écrire à ${safeName(clinic?.name)} sur WhatsApp au ${clinic?.phone || '+237 677 87 34 42'}`, `Message ${safeName(clinic?.name)} on WhatsApp at ${clinic?.phone || '+237 677 87 34 42'}`)}
      title={uiText(locale, 'Contacter le cabinet sur WhatsApp', 'Contact the practice on WhatsApp')}
      className="floating-call grid h-14 w-14 place-items-center rounded-full bg-[#073e53] text-white shadow-[0_8px_24px_rgba(7,1,22,.24)] transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#f0a0a6]"
      data-testid="button-floating-whatsapp"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.371-.272.297-1.04 1.016-1.04 2.479s1.065 2.875 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.438-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.438 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05.02C5.495.02.161 5.354.158 11.908c-.001 2.096.547 4.143 1.588 5.946L.057 23.998l6.282-1.648a11.85 11.85 0 0 0 5.711 1.457h.005c6.554 0 11.89-5.334 11.894-11.89a11.82 11.82 0 0 0-3.484-8.429z" />
      </svg>
    </a>
    <a
      href="tel:+237677873442"
      aria-label={uiText(locale, 'Appeler le cabinet au +237 677 87 34 42', 'Call the practice at +237 677 87 34 42')}
      title={uiText(locale, 'Appeler le cabinet', 'Call the practice')}
      className="floating-phone grid h-14 w-14 place-items-center rounded-full bg-[#2563eb] text-white shadow-[0_8px_24px_rgba(37,99,235,.3)] transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#f0a0a6]"
      data-testid="button-floating-phone"
    >
      <Phone size={23} aria-hidden="true" />
    </a>
  </>;
}

export function SiteShell({ children, clinic, content, overlay = false }: { children: ReactNode; clinic?: SiteContent['clinic']; content?: SiteContent; overlay?: boolean }) {
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
  return <div className="public-site relative min-h-[100dvh] bg-background text-foreground"><AnnouncementBar clinic={clinic} /><Header clinic={clinic} content={content} overlay={overlay} />{children}<Footer clinic={clinic} content={content} /><FloatingCallButton clinic={clinic} /></div>;
}

export function LoadingPage() {
  const locale = useSiteLocale();
  return <div className="mx-auto max-w-6xl px-5 py-24" aria-label={uiText(locale, 'Chargement du site', 'Loading the website')}>
    <div className="h-3 w-32 animate-pulse rounded bg-secondary" />
    <div className="mt-8 h-14 max-w-2xl animate-pulse rounded bg-secondary/80" />
    <div className="mt-4 h-5 max-w-xl animate-pulse rounded bg-secondary/60" />
    <div className="mt-12 grid gap-5 md:grid-cols-3">{[1, 2, 3].map((n) => <div key={n} className="h-56 animate-pulse rounded-lg bg-secondary/60" />)}</div>
  </div>;
}

export function FetchError({ retry }: { retry: () => void }) {
  const locale = useSiteLocale();
  return <div className="mx-auto my-20 max-w-xl rounded-lg border border-border bg-card p-8 text-center" role="alert" data-testid="error-site-content">
    <h2 className="font-display text-2xl">{uiText(locale, 'Nous revenons dans un instant', 'We will be right back')}</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{uiText(locale, 'Le site n’a pas pu charger ses informations. Réessayez dans quelques secondes.', 'The website could not load its information. Please try again in a few seconds.')}</p>
    <button onClick={retry} className="btn-gold mt-6" data-testid="button-retry-content">{uiText(locale, 'Réessayer', 'Try again')}</button>
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

export function ImageFrame({ src, alt, className = '', label, indicator, details, priority = false, onClick }: { src?: string; alt: string; className?: string; label?: string; indicator?: string; details?: string; priority?: boolean; onClick?: () => void }) {
  const locale = useSiteLocale();
  const [isActive, setIsActive] = useState(false);
  const hasImage = !!src?.trim();
  const imageLabel = label || uiText(locale, 'Photographie à ajouter', 'Photograph');
  const indicatorText = indicator?.trim() || imageLabel;
  const detailText = details?.trim() || alt;

  return <div
    className={`image-empty image-frame-interactive relative overflow-hidden ${className}`}
    role={onClick ? 'button' : 'group'}
    aria-label={onClick ? uiText(locale, `Ouvrir l’image : ${indicatorText}`, `Open image: ${indicatorText}`) : uiText(locale, `Visuel : ${indicatorText}`, `Image: ${indicatorText}`)}
    aria-haspopup={onClick ? 'dialog' : undefined}
    tabIndex={0}
    data-image-active={isActive}
    onClick={onClick}
    onKeyDown={onClick ? (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    } : undefined}
    onPointerEnter={(event) => { if (event.pointerType !== 'touch') setIsActive(true); }}
    onPointerLeave={() => setIsActive(false)}
    onFocusCapture={() => setIsActive(true)}
    onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsActive(false);
    }}
  >
    {hasImage ? <>
      <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" className="h-full w-full object-cover" />
      <span className="image-indicator" aria-hidden="true"><span className="image-indicator-label">{indicatorText}</span></span>
      <div className={`image-context ${isActive ? 'is-active' : ''}`} aria-hidden={!isActive}>
        <span className="image-context-kicker">{uiText(locale, 'À découvrir', 'Image details')}</span>
        <p>{detailText}</p>
      </div>
    </> : <div className="absolute inset-0 grid place-items-center p-6 text-center">
      <div className="flex flex-col items-center text-[#070116]"><ImageIcon size={24} strokeWidth={1.3} /><span className="mt-3 max-w-[180px] text-[9px] uppercase tracking-[.2em]">{imageLabel}</span></div>
    </div>}
  </div>;
}

function ActionLink({ href, children, variant = 'gold', testId }: { href: string; children: ReactNode; variant?: 'gold' | 'navy' | 'text'; testId: string }) {
  const locale = useSiteLocale();
  const cls = variant === 'gold' ? 'btn-gold' : variant === 'navy' ? 'btn-navy' : 'inline-flex items-center gap-2 text-sm font-semibold text-[#073e53] transition-colors hover:text-accent';
  return <Link href={routeFor(href, locale)} data-testid={testId} className={cls}>{children}<ArrowRight size={15} /></Link>;
}

function EmptyInline({ title, text }: { title: string; text: string }) {
  return <div className="mt-10 rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center" data-testid="empty-content"><p className="font-display text-xl text-[#073e53]">{title}</p><p className="mt-2 text-sm text-muted-foreground">{text}</p></div>;
}

const serviceAnchor = (s: ServiceItem) => `soin-${s.slug || s.id}`;

function ServiceCard({ item, href }: { item: ServiceItem; href: string }) {
  const locale = useSiteLocale();
  const translated = englishService(item);
  const title = cmsText(locale, item.title, translated.title);
  const summary = cmsText(locale, item.summary || item.description, translated.summary || translated.description);
  const detailHref = locale === 'en'
    ? `/en/services/${translated.slug || item.slug || item.id}/`
    : href;
  return <article id={serviceAnchor(item)} className="card-ref group flex scroll-mt-24 flex-col overflow-hidden" data-testid={`card-service-${item.id}`}>
    <ImageFrame src={item.imageUrl} alt={uiText(locale, `Illustration générée par IA : ${item.title}`, `AI-generated illustration: ${title}`)} label={uiText(locale, 'Illustration du soin', 'Service illustration')} indicator={title} details={summary} className="h-52" />
    <div className="flex flex-1 flex-col p-6"><h3 className="font-display text-xl font-semibold text-[#073e53]">{title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{summary}</p>
      <Link href={detailHref} className="mt-5 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[.12em] text-accent transition-colors hover:text-[#073e53]" data-testid={`link-service-${item.id}`}>{uiText(locale, 'En savoir plus', 'Read more')} <ArrowRight size={14} /></Link></div>
  </article>;
}

function ReviewCard({ review }: { review: Testimonial }) {
  const locale = useSiteLocale();
  const stars = Math.max(0, Math.min(5, review.rating));
  const englishQuote = review.quoteEn?.trim();
  const quote = locale === 'en' && englishQuote ? englishQuote : review.quote;
  const initial = review.name.trim().charAt(0).toLocaleUpperCase(locale === 'en' ? 'en' : 'fr-FR') || '?';
  return <article className="card-ref flex flex-col p-7" data-testid={`card-review-${review.id}`}>
    <Quote className="text-accent" size={22} />
    <p className="mt-4 flex-1 text-[15px] leading-7 text-foreground/85">« {quote} »</p>
    {locale === 'en' && !englishQuote && <p className="mt-3 text-xs italic text-muted-foreground">Original quote in French.</p>}
    <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="review-profile-initial" aria-hidden="true">{initial}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#073e53]">{review.name}</p>
          {review.service && <p className="mt-1 text-[10px] uppercase tracking-[.16em] text-muted-foreground">{locale === 'en' ? review.serviceEn?.trim() || `Service label in French: ${review.service}` : review.service}</p>}
        </div>
      </div>
      <span className="text-xs tracking-widest text-accent" aria-label={uiText(locale, `${stars} sur 5`, `${stars} out of 5`)}>{'★'.repeat(stars)}</span>
    </div>
  </article>;
}

function ReviewCarousel({ reviews, id = 'reviews' }: { reviews: Testimonial[]; id?: string }) {
  const locale = useSiteLocale();
  const [active, setActive] = useState(0);
  if (!reviews.length) return <EmptyInline title={uiText(locale, 'Votre expérience compte', 'Your experience matters')} text={uiText(locale, 'Les avis seront affichés ici lorsqu’ils seront disponibles.', 'Reviews will appear here when they are available.')} />;
  const activeIndex = active % reviews.length;
  const move = (step: number) => setActive((current) => (current + step + reviews.length) % reviews.length);
  const onCarouselKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      move(1);
    }
  };
  return <div className="mx-auto max-w-3xl" role="region" aria-roledescription={uiText(locale, 'carrousel', 'carousel')} aria-label={uiText(locale, 'Avis des visiteurs', 'Visitor reviews')} onKeyDown={onCarouselKeyDown} data-testid={`${id}-carousel`}>
    <div className="overflow-hidden px-1 py-2" aria-live="polite" aria-atomic="true">
      <ReviewCard key={reviews[activeIndex].id} review={reviews[activeIndex]} />
    </div>
    <div className="mt-5 flex items-center justify-between">
      <p className="text-sm font-semibold tabular-nums text-[#073e53]" aria-live="polite" aria-label={uiText(locale, `Témoignage ${activeIndex + 1} sur ${reviews.length}`, `Review ${activeIndex + 1} of ${reviews.length}`)}>{String(activeIndex + 1).padStart(2, '0')} <span className="mx-1 text-accent">/</span> {String(reviews.length).padStart(2, '0')}</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => move(-1)} disabled={reviews.length < 2} aria-label={uiText(locale, 'Avis précédent', 'Previous review')} title={reviews.length < 2 ? uiText(locale, 'La navigation sera active dès qu’un autre avis sera publié.', 'Navigation will be available when another review is published.') : uiText(locale, 'Avis précédent', 'Previous review')} className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#073e53] bg-[#073e53] text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:border-[#b94f5b] hover:bg-[#b94f5b] hover:shadow-lg active:translate-y-0 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#8c6f0b] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:border-[#073e53] disabled:hover:bg-[#073e53] disabled:hover:shadow-md" data-testid={`${id}-previous`}><ArrowLeft size={20} strokeWidth={2.5} /></button>
        <button type="button" onClick={() => move(1)} disabled={reviews.length < 2} aria-label={uiText(locale, 'Avis suivant', 'Next review')} title={reviews.length < 2 ? uiText(locale, 'La navigation sera active dès qu’un autre avis sera publié.', 'Navigation will be available when another review is published.') : uiText(locale, 'Avis suivant', 'Next review')} className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#073e53] bg-[#073e53] text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:border-[#b94f5b] hover:bg-[#b94f5b] hover:shadow-lg active:translate-y-0 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#8c6f0b] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:border-[#073e53] disabled:hover:bg-[#073e53] disabled:hover:shadow-md" data-testid={`${id}-next`}><ArrowRight size={20} strokeWidth={2.5} /></button>
      </div>
    </div>
  </div>;
}

function FaqList({ faqs }: { faqs: SiteContent['faqs'] }) {
  const locale = useSiteLocale();
  const [expanded, setExpanded] = useState<string | null>(faqs[0]?.id || null);
  return <div className="space-y-3">{faqs.map((faq) => <article key={faq.id} className="card-ref overflow-hidden" data-testid={`faq-item-${faq.id}`}>
    <button type="button" id={`faq-trigger-${faq.id}`} aria-controls={`faq-panel-${faq.id}`} aria-expanded={expanded === faq.id} onClick={() => setExpanded(expanded === faq.id ? null : faq.id)} className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#b94f5b]" data-testid={`button-faq-${faq.id}`}><span className="text-[15px] font-semibold text-[#073e53] md:text-base">{cmsText(locale, faq.question, englishFaq(faq).question)}</span><ChevronDown className={`shrink-0 text-accent transition-transform ${expanded === faq.id ? 'rotate-180' : ''}`} size={20} aria-hidden="true" /></button>
    <div id={`faq-panel-${faq.id}`} role="region" aria-labelledby={`faq-trigger-${faq.id}`} aria-hidden={expanded !== faq.id} className="faq-panel" data-open={expanded === faq.id}><div><p className="px-6 pb-6 text-sm leading-7 text-muted-foreground">{cmsText(locale, faq.answer, englishFaq(faq).answer)}</p></div></div>
  </article>)}</div>;
}

function MetricCounter({ value, label, href }: { value: number; label: string; href?: string }) {
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
  const body = <><p className="font-display text-3xl font-semibold tabular-nums text-[#073e53] md:text-4xl">{display}</p><p className="mt-1 text-[10px] uppercase tracking-[.14em] text-muted-foreground sm:text-[11px]">{label}</p></>;
  return <div id={nodeId} className="border-l border-[#073e53]/15 pl-5 first:border-0 first:pl-0">{href ? <Link href={href} aria-label={`${value} ${label}`} className="block rounded-md px-2 py-1 transition-transform hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">{body}</Link> : body}</div>;
}

function BookButton({ clinic, children, testId, outline = false }: { clinic: SiteContent['clinic']; children: ReactNode; testId: string; outline?: boolean }) {
  return <a href={bookHref(clinic)} target={clinic.bookingUrl ? '_blank' : undefined} rel="noreferrer" className={outline ? 'btn-outline-light' : 'btn-gold'} data-testid={testId}>{children} <ArrowRight size={15} /></a>;
}

const visitSteps = [
  { n: '1', title: 'Prise de contact', text: 'Vous nous appelez ou écrivez pour convenir d’un créneau qui vous convient.', titleEn: 'Get in touch', textEn: 'Call or write to the practice to ask about arranging a suitable time.' },
  { n: '2', title: 'Accueil et échange', text: 'Nous prenons le temps d’écouter vos attentes et vos antécédents.', titleEn: 'Welcome and conversation', textEn: 'The team takes time to listen to what brings you in and any relevant background you wish to share.' },
  { n: '3', title: 'Examen et explications', text: 'Nous vous expliquons ce que nous observons, avec des mots simples.', titleEn: 'Examination and explanation', textEn: 'The team explains its observations in clear, everyday language.' },
  { n: '4', title: 'Plan de soin partagé', text: 'Vous repartez avec une proposition claire, à décider ensemble.', titleEn: 'Discussing next steps', textEn: 'You can discuss a clear proposal together and decide how you would like to proceed.' },
];

export function HomePage({ content }: { content: SiteContent }) {
  const { clinic, hero } = content;
  const locale = useSiteLocale();
  const displayFaqs = faqsForDisplay(content.faqs);
  const publicReviews = usePublicReviews();
  const testimonials = combinePublicReviews(publicReviews.data ?? [], content.testimonials);
  const lead = visibleTeamMembers(content.team)[0];
  const photos = visibleGallery(content.gallery);
  const reviewCount = summarizePublishedReviews(testimonials).count;
  const faqCount = displayFaqs.length;
  const publishedPostCount = content.blogPosts.filter((post) => post.published).length;
  const activeInformationCount = content.campaigns.filter((campaign) => campaign.active).length;
  const whyChooseCount = content.whyChoose?.values.length ?? 0;
  const partnerLogo = content.gallery.find((item) => item.id === partnerLogoId);
  const partnerPhoto = content.gallery.find((item) => item.id === partnerPhotoId);
  const heroImg = hero.imageUrl?.trim();
  const heroEyebrowEn = hero.eyebrowEn?.trim() || `Dental practice in ${safeCity(clinic.city)}`;
  const heroTitleEn = hero.titleEn?.trim() || `Attentive dental care in ${safeCity(clinic.city)}.`;
  const heroDescriptionEn = hero.descriptionEn?.trim() || `Cabinet Sourire Serein welcomes patients at Clinique La Bienveillance in ${safeCity(clinic.city)} for dental consultations and care.`;
  const isIllustrativeHero = heroImg === `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/cabinet-media/${heroIllustration.storagePath}`;
  return (
    <SiteShell clinic={clinic} content={content} overlay>
      <main>
        <section className="relative flex min-h-[92dvh] items-center overflow-hidden bg-[#073e53] text-white md:min-h-[100dvh]" data-testid="section-hero">
          {heroImg ? <img src={heroImg} alt={isIllustrativeHero ? uiText(locale, heroIllustration.alt, 'Illustrative dental-care image, not a photograph of the practice') : heroImg === partnerPhoto?.imageUrl ? cmsText(locale, partnerPhoto.alt, partnerPhoto.altEn) : uiText(locale, 'Vue du cabinet dentaire', 'View of the dental practice')} fetchPriority="high" className={`absolute inset-0 h-full w-full object-cover ${isIllustrativeHero ? 'object-[100%_38%] md:object-[center_40%]' : 'object-center'}`} data-testid="img-hero" /> : <div aria-hidden className="hero-fallback absolute inset-0" />}
          <div aria-hidden className={`absolute inset-0 ${heroImg ? 'bg-[#070116]/60' : 'bg-[#070116]/15'}`} />
          <div className="relative z-10 mx-auto w-full max-w-[1240px] px-5 pb-20 pt-32 md:px-8">
            <div className="mx-auto max-w-[620px] reveal">
              {(locale === 'fr' ? hero.eyebrow : heroEyebrowEn) && <p className="mb-5 text-[11px] font-semibold uppercase tracking-[.26em] text-[#f0a0a6]">{locale === 'fr' ? hero.eyebrow : heroEyebrowEn}</p>}
              <h1 className="font-display text-[clamp(2.4rem,5.4vw,3.9rem)] font-semibold leading-[1.1]">{locale === 'en' ? heroTitleEn : hero.title || 'Un sourire en confiance, un soin tout en douceur.'}</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-white/85">{locale === 'en' ? heroDescriptionEn : hero.description || 'À Douala, nous avons imaginé un cabinet où chaque visite commence par une écoute attentive.'}</p>
              <div className="mt-9 flex flex-wrap gap-4">
                <BookButton clinic={clinic} testId="button-hero-book">{locale === 'en' ? hero.primaryActionEn?.trim() || 'Request an appointment' : hero.primaryAction || 'Prendre rendez-vous'}</BookButton>
                <Link href={routeFor('/soins', locale, content)} className="btn-outline-light" data-testid="link-hero-care">{locale === 'en' ? hero.secondaryActionEn?.trim() || 'Explore our services' : hero.secondaryAction || 'Découvrir nos soins'}</Link>
              </div>
            </div>
          </div>
          {isIllustrativeHero && <p className="absolute bottom-4 left-5 z-10 max-w-[calc(100%-6rem)] text-[10px] leading-4 text-white/75 md:left-8">{uiText(locale, 'Illustration générée par IA — ne représente pas les locaux ni l’équipe réelle.', 'AI-generated illustration — it does not depict the actual premises or team.')}</p>}
        </section>

        {[content.services.length, visibleTeamMembers(content.team).length, photos.length, reviewCount, faqCount, publishedPostCount, activeInformationCount, whyChooseCount].some((count) => count > 0) && <section className="border-b border-[#073e53]/10 bg-[#f3f1f5] py-8 md:py-10" aria-label={uiText(locale, 'Le cabinet en quelques repères', 'The practice at a glance')}>
          <div className="wrap flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:justify-start">
            {content.services.length > 0 && <MetricCounter value={content.services.length} label={uiText(locale, 'Soins présentés', 'Services listed')} href={routeFor('/soins/', locale, content)} />}
            {visibleTeamMembers(content.team).length > 0 && <MetricCounter value={visibleTeamMembers(content.team).length} label={uiText(locale, 'Membres de l’équipe', 'Team members')} href={routeFor('/equipe/', locale, content)} />}
            {photos.length > 0 && <MetricCounter value={photos.length} label={uiText(locale, 'Images en galerie', 'Gallery images')} href={routeFor('/galerie/', locale, content)} />}
            {whyChooseCount > 0 && <MetricCounter value={whyChooseCount} label={uiText(locale, 'Raisons de nous choisir', 'Reasons to choose us')} href={routeFor('/pourquoi-nous-choisir', locale, content)} />}
            {reviewCount > 0 && <MetricCounter value={reviewCount} label={uiText(locale, 'Avis publiés', 'Published reviews')} href={routeFor('/avis', locale, content)} />}
            {faqCount > 0 && <MetricCounter value={faqCount} label={uiText(locale, 'Questions fréquentes', 'Frequently asked questions')} href={routeFor('/faq', locale, content)} />}
            {publishedPostCount > 0 && <MetricCounter value={publishedPostCount} label={uiText(locale, 'Articles publiés', 'Published articles')} href={routeFor('/blog/', locale, content)} />}
            {activeInformationCount > 0 && <MetricCounter value={activeInformationCount} label={uiText(locale, 'Informations actives', 'Active updates')} href={routeFor('/informations', locale, content)} />}
          </div>
        </section>}

        <section id="clinique-partenaire" className="section-pad bg-[#e6e3eb]" aria-labelledby="partner-heading">
          <div className="wrap grid items-center gap-8 md:grid-cols-[1fr_1.05fr] md:gap-12">
            <div className="overflow-hidden rounded-2xl">
              <ImageFrame src={partnerPhoto?.imageUrl || heroImg} alt={uiText(locale, 'Façade de la Clinique La Bienveillance à Douala', 'Exterior of Clinique La Bienveillance in Douala')} label={uiText(locale, 'Photo de l’établissement partenaire', 'Partner clinic photograph')} indicator={uiText(locale, 'Établissement partenaire', 'Partner clinic')} details={uiText(locale, 'La façade du lieu qui accueille le cabinet à Douala.', 'The exterior of the clinic setting where the dental practice welcomes patients in Douala.')} className="aspect-[4/3] w-full" />
            </div>
            <div className="rounded-2xl border border-[#073e53]/10 bg-white p-7 shadow-[0_18px_55px_rgba(7,1,22,.08)] md:p-10">
              {partnerLogo?.imageUrl && <img src={partnerLogo.imageUrl} alt={cmsText(locale, partnerLogo.alt || 'Logo de la Clinique La Bienveillance', partnerLogo.altEn)} width="96" height="96" loading="lazy" className="mb-5 h-20 w-20 rounded-full bg-white object-contain ring-1 ring-[#073e53]/10" />}
              <p className="eyebrow">{uiText(locale, 'Établissement partenaire', 'Partner clinic')}</p>
              <h2 id="partner-heading" className="mt-3 font-display text-3xl font-semibold leading-tight text-[#073e53] md:text-4xl">{uiText(locale, 'Le Cabinet Sourire Serein, au sein de La Bienveillance.', 'Cabinet Sourire Serein at Clinique La Bienveillance.')}</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{uiText(locale, 'Le cabinet dentaire vous accueille au sein de la Clinique La Bienveillance, à Douala. Retrouvez les informations sur l’établissement partenaire et ses autres services sur son site officiel.', 'The dental practice welcomes patients at Clinique La Bienveillance in Douala. Visit the clinic’s official website for information about the partner clinic and its other services.')}</p>
              <p className="mt-4 text-sm font-medium text-[#073e53]">{clinic.address ? (locale === 'en' ? `Address supplied by the practice (not translated): ${clinic.address}` : clinic.address) : uiText(locale, 'Ancienne gare routière, Dakar, Douala, Cameroun', 'Address information will be provided by the practice.')}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href={partnerSite} target="_blank" rel="noopener noreferrer" className="btn-navy" data-testid="link-partner-clinic">{uiText(locale, 'Visiter la Clinique La Bienveillance', 'Visit Clinique La Bienveillance')} <ArrowRight size={15} /></a>
                <a href={clinic.mapUrl || mapsDirections} target="_blank" rel="noopener noreferrer" className="btn-teal" data-testid="link-partner-directions">{uiText(locale, 'Voir l’itinéraire', 'Get directions')} <MapPin size={15} /></a>
              </div>
            </div>
          </div>
        </section>

        <section id="soins" className="section-pad bg-background">
          <div className="wrap">
            <SectionHead eyebrow={uiText(locale, 'Nos soins', 'Our services')} title={uiText(locale, 'Prendre soin, avec justesse.', 'Care, with consideration.')} text={uiText(locale, 'Des soins pensés pour préserver votre santé et vous aider à vous sentir bien, tout simplement.', 'Information about the care offered by the practice, shared clearly and with your comfort in mind.')} />
            <p className="mt-4 max-w-3xl text-xs leading-5 text-muted-foreground">{uiText(locale, 'Les visuels des soins sont des illustrations générées par IA. Ils ne représentent ni les locaux ni l’équipe réelle.', 'Service visuals are AI-generated illustrations and do not depict the actual premises or team.')}</p>
            {content.services.length ? <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{content.services.slice(0, 6).map((s) => <ServiceCard key={s.id} item={s} href={`/soins/${s.slug || s.id}`} />)}</div>
              : <EmptyInline title={uiText(locale, 'Nos soins seront bientôt présentés ici', 'Service information is not available yet')} text={uiText(locale, 'Les informations du cabinet seront mises à jour prochainement.', 'Practice information will be added here when available.')} />}
            <div className="mt-10 text-center"><ActionLink href="/soins" variant="navy" testId="link-home-all-services">{uiText(locale, 'Tous les soins', 'All services')}</ActionLink></div>
          </div>
        </section>

        <section id="galerie" className="section-pad bg-[#e6e3eb]">
          <div className="wrap">
            <SectionHead eyebrow={uiText(locale, 'Le cabinet', 'The practice')} title={uiText(locale, 'Un lieu pensé pour votre confort.', 'A place designed with your comfort in mind.')} text={uiText(locale, 'Un aperçu de l’atmosphère qui vous attend.', 'A glimpse of the setting that welcomes you.')} />
            {photos.length ? <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">{photos.slice(0, 6).map((p) => <figure key={p.id} className="overflow-hidden rounded-md" data-testid={`home-gallery-${p.id}`}><ImageFrame src={p.imageUrl} alt={cmsText(locale, p.alt, p.altEn)} label={uiText(locale, 'Photo du cabinet à ajouter', 'Practice photograph')} indicator={galleryCaption(p, locale)} details={cmsText(locale, p.alt, p.altEn)} className="aspect-[4/3]" /><figcaption className="sr-only">{cmsText(locale, p.alt, p.altEn)}</figcaption></figure>)}</div>
              : <EmptyInline title={uiText(locale, 'L’espace se dévoilera bientôt', 'The gallery is being prepared')} text={uiText(locale, 'La galerie du cabinet est en préparation.', 'Practice photographs will be shared here when available.')} />}
            <div className="mt-10 text-center"><ActionLink href="/galerie" variant="navy" testId="link-home-gallery">{uiText(locale, 'Voir la galerie', 'View the gallery')}</ActionLink></div>
          </div>
        </section>

        {lead && <section id="praticien" className="section-pad bg-background">
          <div className="wrap grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <ImageFrame src={lead?.imageUrl} alt={lead ? `${uiText(locale, `Portrait de ${lead.name}`, `Portrait of ${lead.name}`)}` : uiText(locale, 'Présentation de l’équipe', 'Team introduction')} label={uiText(locale, 'Portrait à ajouter', 'Portrait to be added')} indicator={lead?.name || uiText(locale, 'Équipe du cabinet', 'Practice team')} details={lead ? cmsText(locale, lead.role, lead.roleEn) : uiText(locale, 'Présentation de l’équipe du cabinet.', 'Practice team introduction')} className="aspect-[4/5] w-full rounded-md md:max-h-[560px]" />
            <div>
              <SectionHead center={false} eyebrow={lead ? cmsText(locale, lead.role, lead.roleEn) : uiText(locale, 'Votre praticien', 'Your care team')} title={lead?.name || uiText(locale, 'Une équipe, avant tout humaine.', 'A team that puts people first.')} />
              <p className="mt-6 text-[15px] leading-7 text-muted-foreground">{lead ? cmsText(locale, lead.biography, lead.biographyEn) : uiText(locale, 'Nous sommes là pour vous accueillir tels que vous êtes et construire avec vous un parcours de soin qui a du sens.', 'We are here to welcome you as you are and discuss care that makes sense for you.')}</p>
              <div className="mt-8"><ActionLink href="/equipe" testId="link-home-team">{uiText(locale, 'Rencontrer l’équipe', 'Meet the team')}</ActionLink></div>
            </div>
          </div>
        </section>}

        <section id="premiere-visite" className="section-pad bg-[#073e53] text-white">
          <div className="wrap">
            <div className="mx-auto max-w-2xl text-center"><p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#f0a0a6]">{uiText(locale, 'Votre première visite', 'Your first visit')}</p><h2 className="mt-3 font-display text-3xl font-semibold md:text-[2.6rem]">{uiText(locale, 'Comment se déroule un premier rendez-vous ?', 'What happens at a first appointment?')}</h2><span className="mx-auto mt-5 block h-[2px] w-14 bg-[#f0a0a6]" /></div>
            <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{visitSteps.map((s) => <li key={s.n} className="rounded-md border border-white/12 bg-white/[.04] p-6" data-testid={`step-visit-${s.n}`}><span className="font-display text-3xl font-semibold text-[#f0a0a6]">0{s.n}</span><h3 className="mt-3 text-base font-semibold">{locale === 'en' ? s.titleEn : s.title}</h3><p className="mt-2 text-sm leading-6 text-white/70">{locale === 'en' ? s.textEn : s.text}</p></li>)}</ol>
          </div>
        </section>

        <section id="avis" className="section-pad bg-[#e6e3eb]">
          <div className="wrap">
            <SectionHead eyebrow={uiText(locale, 'Témoignages', 'Reviews')} title={uiText(locale, 'La confiance se construit ensemble.', 'Trust is built together.')} />
            <ReviewTrustPanel variant="home" testimonials={content.testimonials} ctaHref={routeFor('/avis', locale, content)} ctaLabel={uiText(locale, 'Lire tous les avis', 'Read all reviews')} />
            <ReviewCarousel reviews={testimonials.slice(0, 3)} id="home-reviews" />
            <div className="mt-10 text-center"><ActionLink href="/avis" variant="navy" testId="link-home-reviews">{uiText(locale, 'Tous les témoignages', 'All reviews')}</ActionLink></div>
          </div>
        </section>

        <section id="faq" className="section-pad bg-background">
          <div className="mx-auto max-w-3xl px-5 md:px-8">
            <SectionHead eyebrow={uiText(locale, 'Questions fréquentes', 'Frequently asked questions')} title={uiText(locale, 'Les réponses, sans détour.', 'Straightforward answers.')} />
            <div className="mt-10">{displayFaqs.length ? <FaqList faqs={displayFaqs.slice(0, 5)} /> : <EmptyInline title={uiText(locale, 'Une question particulière ?', 'Have a question?')} text={uiText(locale, 'Contactez-nous, nous serons heureux de vous répondre.', 'Contact us and we will be glad to help.')} />}</div>
            <div className="mt-8 text-center"><ActionLink href="/faq" variant="text" testId="link-home-faq">{uiText(locale, 'Toutes les questions', 'All questions')}</ActionLink></div>
          </div>
        </section>

        <section id="rendez-vous" className="bg-[#073e53] text-white">
          <div className="wrap grid gap-10 py-16 md:grid-cols-[1.2fr_1fr] md:items-center md:py-24">
            <div><p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#f0a0a6]">{uiText(locale, 'Prendre rendez-vous', 'Appointments')}</p><h2 className="mt-3 font-display text-3xl font-semibold leading-tight md:text-[2.6rem]">{uiText(locale, 'Votre prochain rendez-vous peut être plus simple que vous ne le pensez.', 'Taking the next step can start with a simple conversation.')}</h2><div className="mt-8 flex flex-wrap gap-4"><BookButton clinic={clinic} testId="button-home-final-book">{uiText(locale, 'Prendre rendez-vous', 'Request an appointment')}</BookButton><Link href={routeFor('/contact', locale, content)} className="btn-outline-light" data-testid="link-home-contact">{uiText(locale, 'Nous contacter', 'Contact us')}</Link></div></div>
            <ul className="space-y-5 rounded-md border border-white/12 bg-white/[.04] p-7 text-sm">
               <li className="flex gap-4"><Phone size={18} className="mt-0.5 shrink-0 text-[#f0a0a6]" /><a href={`tel:${clinic.phone || ''}`} data-testid="link-home-phone">{clinic.phone || uiText(locale, 'Téléphone à renseigner', 'Phone number to be added')}</a></li>
               <li className="flex gap-4"><MessageCircle size={18} className="mt-0.5 shrink-0 text-[#f0a0a6]" /><a href={`mailto:${PRACTICE_CONTACT_EMAIL}`} className="break-all" data-testid="link-home-email">{PRACTICE_CONTACT_EMAIL}</a></li>
               <li className="flex gap-4"><MapPin size={18} className="mt-0.5 shrink-0 text-[#f0a0a6]" /><span>{clinic.address || uiText(locale, 'Douala, Cameroun', 'Douala, Cameroon')}</span></li>
               <li className="flex gap-4"><Clock3 size={18} className="mt-0.5 shrink-0 text-[#f0a0a6]" /><span className="whitespace-pre-line text-white/80">{locale === 'en' ? hoursLabel(clinic, locale) : `Horaires : ${hoursLabel(clinic, locale)}`}</span></li>
            </ul>
          </div>
        </section>
        <RelatedPages content={content} />
      </main>
    </SiteShell>
  );
}

export function ServicesPage({ content }: { content: SiteContent }) {
  const locale = useSiteLocale();
  const [location] = useLocation();
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(decodeURIComponent(hash))?.scrollIntoView({ block: 'start' });
  }, [location]);
  return <SiteShell clinic={content.clinic} content={content}><main><PageIntro eyebrow={uiText(locale, 'Des soins à votre mesure', 'Dental services')} title={uiText(locale, 'La santé d’abord. Le confort, toujours.', 'Your health first. Your comfort, always.')} text={uiText(locale, 'Nous prenons soin de votre sourire avec une approche préventive, des gestes précis et des explications qui vous ressemblent.', 'Explore the dental services offered by the practice, with clear information to help you understand what is available.')} />
    <section className="wrap section-pad">
      <p className="mb-8 max-w-3xl text-xs leading-5 text-muted-foreground">{uiText(locale, 'Les visuels des soins sont des illustrations générées par IA. Ils ne représentent ni les locaux ni l’équipe réelle du Cabinet Sourire Serein.', 'Service visuals are AI-generated illustrations. They do not depict the actual premises or the Cabinet Sourire Serein team.')}</p>
      {content.services.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{content.services.map((s) => <ServiceCard key={s.id} item={s} href={`/soins/${s.slug || s.id}`} />)}</div> : <EmptyInline title={uiText(locale, 'La carte des soins se prépare', 'Service information is being prepared')} text={uiText(locale, 'Revenez bientôt pour découvrir les soins proposés par le cabinet.', 'Please check back for information about the services offered by the practice.')} />}
      <div className="mt-16 flex flex-col gap-6 rounded-md bg-[#073e53] p-8 text-white md:flex-row md:items-center md:justify-between md:p-10"><div><h2 className="font-display text-2xl font-semibold md:text-3xl">{uiText(locale, 'Une question avant de venir ?', 'Questions before your visit?')}</h2><p className="mt-2 text-sm text-white/70">{uiText(locale, 'Nous sommes là pour vous orienter, sans engagement.', 'Contact us for information, with no obligation.')}</p></div><ActionLink href="/contact" testId="link-services-contact">{uiText(locale, 'Échanger avec nous', 'Talk with us')}</ActionLink></div>
    </section><RelatedPages content={content} current="soins" /></main></SiteShell>;
}

export function WhyChoosePage({ content }: { content: SiteContent }) {
  const locale = useSiteLocale();
  return <SiteShell clinic={content.clinic} content={content}>
    <WhyChooseBody
      locale={locale}
      clinic={{ name: content.clinic.name, city: content.clinic.city, phone: '+237 677 873 442', email: PRACTICE_CONTACT_EMAIL }}
      content={content.whyChoose}
    />
  </SiteShell>;
}

export function ServiceDetailPage({ content, slug }: { content: SiteContent; slug?: string }) {
  const locale = useSiteLocale();
  const service = content.services.find((item) => item.slug === slug || item.slugEn === slug || englishService(item).slug === slug);
  if (!service) return <SiteShell clinic={content.clinic} content={content}>
    <main className="mx-auto max-w-3xl px-5 py-24 text-center">
      <p className="eyebrow">{uiText(locale, 'Soin introuvable', 'Service not found')}</p>
      <h1 className="mt-4 font-display text-4xl font-semibold text-[#073e53]">{uiText(locale, 'Cette page de soin n’est pas disponible.', 'This service page is not available.')}</h1>
      <div className="mt-7"><ActionLink href="/soins" testId="link-service-detail-back">{uiText(locale, 'Voir tous les soins', 'View all services')}</ActionLink></div>
    </main>
  </SiteShell>;
  const translated = englishService(service);
  const splitSteps = (value?: string) => value?.split(/\n+/).map((step) => step.trim()).filter(Boolean);
  return <SiteShell clinic={content.clinic} content={content}>
    <div className="mx-auto max-w-7xl px-5 pt-6 md:px-8">
      <ActionLink href="/soins" variant="text" testId="link-service-detail-back">{uiText(locale, 'Tous les soins', 'All services')}</ActionLink>
    </div>
    <ServiceDetailBody
      locale={locale}
      clinic={{ name: content.clinic.name, city: content.clinic.city, phone: '+237 677 873 442', email: PRACTICE_CONTACT_EMAIL }}
      service={{
        id: service.id,
         title: locale === 'en' ? translated.title : service.title,
        slug: service.slug,
         summary: locale === 'en' ? translated.summary : service.summary,
         description: locale === 'en' ? translated.description : service.description,
        imageUrl: service.imageUrl,
        titleEn: service.titleEn,
        purpose: service.purpose,
         purposeEn: locale === 'en' ? translated.purpose : service.purposeEn,
        imageAlt: service.imageAlt,
         summaryEn: locale === 'en' ? translated.summary : service.summaryEn,
         descriptionEn: locale === 'en' ? translated.description : service.descriptionEn,
         procedureSteps: splitSteps(service.procedureSteps),
         procedureStepsEn: splitSteps(locale === 'en' ? translated.procedureSteps : service.procedureStepsEn),
         imageAltEn: locale === 'en' ? translated.imageAlt : service.imageAltEn,
      }}
    />
  </SiteShell>;
}

export function TeamPage({ content }: { content: SiteContent }) {
  const locale = useSiteLocale();
  const team = visibleTeamMembers(content.team);
  return <SiteShell clinic={content.clinic} content={content}><main><PageIntro eyebrow={uiText(locale, 'Derrière chaque sourire', 'The people behind your care')} title={uiText(locale, 'Une équipe, avant tout humaine.', 'A team that puts people first.')} text={uiText(locale, 'Nous sommes là pour vous accueillir tels que vous êtes et construire avec vous un parcours de soin qui a du sens.', 'We are here to welcome you as you are and discuss a care journey that makes sense for you.')} />
    <section className="wrap section-pad">
      <figure className="mb-10 overflow-hidden rounded-2xl border border-[#073e53]/10 bg-white shadow-sm" data-testid="photo-clinic-team">
        <ImageFrame src={clinicPhotoUrl('clinic-team.jpg')} alt={uiText(locale, 'Un groupe de professionnels de santé réuni dans les locaux de l’établissement partenaire.', 'A group of health professionals gathered at the partner clinic.')} indicator={uiText(locale, 'Équipe de santé', 'Healthcare team')} details={uiText(locale, 'Un aperçu de l’équipe réunie dans l’établissement partenaire.', 'A glimpse of the team at the partner clinic.')} className="aspect-[3/2] md:aspect-[16/8]" />
        <figcaption className="px-4 py-3 text-sm text-muted-foreground">{uiText(locale, 'L’équipe réunie dans l’établissement partenaire.', 'The team gathered at the partner clinic.')}</figcaption>
      </figure>
      {team.length ? <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{team.map((m) => <article key={m.id} className="card-ref overflow-hidden" data-testid={`card-team-${m.id}`}><ImageFrame src={m.imageUrl} alt={uiText(locale, `Portrait de ${m.name}`, `Portrait of ${m.name}`)} label={uiText(locale, 'Portrait à ajouter', 'Portrait')} indicator={m.name} details={cmsText(locale, m.role, m.roleEn)} className="aspect-[4/5]" /><div className="p-6"><p className="eyebrow">{cmsText(locale, m.role, m.roleEn)}</p><h2 className="mt-2 font-display text-2xl font-semibold text-[#073e53]">{m.name}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{cmsText(locale, m.biography, m.biographyEn)}</p></div></article>)}</div> : <EmptyInline title={uiText(locale, 'Faisons connaissance bientôt', 'Meet the team soon')} text={uiText(locale, 'Les portraits et présentations de l’équipe seront publiés ici.', 'Team portraits and introductions will appear here when available.')} />}
    </section></main></SiteShell>;
}

export function GalleryPage({ content }: { content: SiteContent }) {
  const locale = useSiteLocale();
  const photos = visibleGallery(content.gallery);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const staticEnglish: Record<string, { alt: string; caption: string }> = {
    'clinic-sign': { alt: 'Exterior sign of Clinique La Bienveillance in Douala.', caption: 'Clinique La Bienveillance sign' },
    'clinic-professional': { alt: 'A healthcare professional working at a desk.', caption: 'A moment at work' },
    'waiting-room': { alt: 'The waiting room at the partner clinic.', caption: 'The welcome area' },
    'care-team-conversation': { alt: 'A healthcare professional speaking with a patient at the partner clinic.', caption: 'A conversation with the care team' },
    'family-welcome': { alt: 'A healthcare professional welcomes a family at the partner clinic.', caption: 'Welcoming families' },
    'patient-support': { alt: 'A healthcare professional supporting a patient during a conversation.', caption: 'Patient support' },
  };
  const siteImages = [
    ...clinicGalleryPhotos.map((photo) => ({
      src: photo.src,
      alt: locale === 'en' ? staticEnglish[photo.id]?.alt || photo.alt : photo.alt,
      caption: locale === 'en' ? staticEnglish[photo.id]?.caption || photo.caption : photo.caption,
    })),
    ...photos.filter((photo) => photo.imageUrl?.trim()).map((photo) => ({
      src: photo.imageUrl,
      alt: cmsText(locale, photo.alt, photo.altEn),
      caption: galleryCaption(photo, locale),
    })),
    ...content.services.filter((service) => service.imageUrl?.trim()).map((service) => ({
      src: service.imageUrl,
      alt: cmsText(locale, service.imageAlt || service.title, service.imageAltEn || service.titleEn),
      caption: cmsText(locale, service.title, service.titleEn),
    })),
    ...visibleTeamMembers(content.team).filter((member) => member.imageUrl?.trim()).map((member) => ({
      src: member.imageUrl,
      alt: uiText(locale, `Portrait de ${member.name}`, `Portrait of ${member.name}`),
      caption: cmsText(locale, member.role, member.roleEn) || member.name,
    })),
    ...content.blogPosts.filter((post) => post.published && post.imageUrl?.trim()).map((post) => ({
      src: post.imageUrl,
      alt: cmsText(locale, post.imageAlt || post.title, post.imageAltEn || post.titleEn),
      caption: cmsText(locale, post.title, post.titleEn),
    })),
    ...content.campaigns.filter((campaign) => campaign.active && campaign.mediaType === 'image' && campaign.imageUrl?.trim()).map((campaign) => ({
      src: campaign.imageUrl,
      alt: cmsText(locale, campaign.title, campaign.titleEn),
      caption: cmsText(locale, campaign.title, campaign.titleEn),
    })),
    ...(content.hero.imageUrl?.trim() ? [{
      src: content.hero.imageUrl,
      alt: cmsText(locale, content.hero.title, content.hero.titleEn),
      caption: uiText(locale, 'Bannière d’accueil', 'Homepage banner'),
    }] : []),
  ].filter((image, index, all) => all.findIndex((candidate) => candidate.src === image.src) === index);
  const activeImage = activeImageIndex === null ? null : siteImages[activeImageIndex];
  const showPreviousImage = () => setActiveImageIndex((index) => index === null ? null : (index - 1 + siteImages.length) % siteImages.length);
  const showNextImage = () => setActiveImageIndex((index) => index === null ? null : (index + 1) % siteImages.length);
  const handleGalleryKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPreviousImage();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      showNextImage();
    }
  };
  return <SiteShell clinic={content.clinic} content={content}><main><PageIntro eyebrow={uiText(locale, 'Le cabinet en images', 'The practice in pictures')} title={uiText(locale, 'Un lieu pensé pour votre confort.', 'A place designed with your comfort in mind.')} text={uiText(locale, 'Retrouvez les visuels officiels du lieu qui accueille le cabinet dentaire.', 'See images of the setting where the dental practice welcomes patients.')} />
    <section className="wrap section-pad">
      <p className="mb-8 max-w-3xl text-xs leading-5 text-muted-foreground">{uiText(locale, 'Cette galerie réunit des photos fournies par l’établissement partenaire et, pour certains soins, des illustrations générées par IA qui ne représentent pas les locaux ni l’équipe réelle.', 'This gallery includes photographs supplied by the partner clinic and, for some services, AI-generated illustrations that do not depict the actual premises or team.')}</p>
      <p className="mb-5 text-sm font-medium text-[#073e53]">{uiText(locale, 'Sélectionnez une image pour l’agrandir, puis faites défiler toutes les images du site.', 'Select an image to enlarge it, then browse through all images on the site.')} <span className="text-muted-foreground">({siteImages.length})</span></p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {clinicGalleryPhotos.map((photo) => <figure key={photo.id} className="overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/5" data-testid={`gallery-image-${photo.id}`}>
          <ImageFrame src={photo.src} alt={locale === 'en' ? staticEnglish[photo.id]?.alt || 'Image description not available in English.' : photo.alt} label={uiText(locale, 'Photo du cabinet ou de l’établissement partenaire', 'Practice or partner-clinic photograph')} indicator={locale === 'en' ? staticEnglish[photo.id]?.caption || photo.caption : photo.caption} details={locale === 'en' ? staticEnglish[photo.id]?.alt || 'Image description not available in English.' : photo.alt} className="aspect-[4/3] cursor-zoom-in" onClick={() => setActiveImageIndex(siteImages.findIndex((image) => image.src === photo.src))} />
          <figcaption className="px-3 py-2 text-xs font-medium text-[#073e53] md:px-4 md:py-3 md:text-sm">{locale === 'en' ? staticEnglish[photo.id]?.caption || 'Image caption not available in English.' : photo.caption}</figcaption>
        </figure>)}
        {photos.map((photo) => <figure key={photo.id} className="overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/5" data-testid={`gallery-image-${photo.id}`}>
          <ImageFrame src={photo.imageUrl} alt={cmsText(locale, photo.alt, photo.altEn)} label={uiText(locale, 'Illustration de l’activité', 'Activity illustration')} indicator={galleryCaption(photo, locale)} details={cmsText(locale, photo.alt, photo.altEn)} className={`aspect-[4/3] ${photo.imageUrl?.trim() ? 'cursor-zoom-in' : ''}`} onClick={photo.imageUrl?.trim() ? () => setActiveImageIndex(siteImages.findIndex((image) => image.src === photo.imageUrl)) : undefined} />
          <figcaption className="px-3 py-2 text-xs font-medium text-[#073e53] md:px-4 md:py-3 md:text-sm">{galleryCaption(photo, locale)}</figcaption>
        </figure>)}
      </div>
      <Dialog open={activeImageIndex !== null} onOpenChange={(open) => { if (!open) setActiveImageIndex(null); }}>
        <DialogContent
          className="gallery-lightbox fixed inset-0 !left-0 !top-0 z-50 grid h-[100dvh] w-screen max-h-[100dvh] max-w-none !translate-x-0 !translate-y-0 grid-rows-[auto_1fr_auto] gap-0 overflow-hidden rounded-none border-0 bg-[#060914]/95 p-0 text-white shadow-none [&>button:last-child]:hidden"
          onKeyDown={handleGalleryKeyDown}
          onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            const endX = event.changedTouches[0]?.clientX;
            if (touchStartX.current !== null && endX !== undefined && Math.abs(endX - touchStartX.current) > 55) {
              if (endX < touchStartX.current) showNextImage();
              else showPreviousImage();
            }
            touchStartX.current = null;
          }}
        >
          {activeImage && <>
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 sm:px-7">
              <DialogTitle className="min-w-0 truncate font-display text-base font-semibold text-white sm:text-xl">{activeImage.caption}</DialogTitle>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs tabular-nums text-white/70" aria-live="polite">{activeImageIndex! + 1} / {siteImages.length}</span>
                <DialogClose asChild>
                  <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-white/25 text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label={uiText(locale, 'Fermer la galerie', 'Close gallery')} data-testid="button-close-image-viewer"><X size={21} /></button>
                </DialogClose>
              </div>
            </div>
            <div className="relative flex min-h-0 items-center justify-center px-3 py-4 sm:px-16 sm:py-6">
              <button type="button" onClick={showPreviousImage} className="absolute left-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/35 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-6 sm:h-14 sm:w-14" aria-label={uiText(locale, 'Image précédente', 'Previous image')} data-testid="button-previous-image"><ArrowLeft size={22} /></button>
              <img key={activeImage.src} src={activeImage.src} alt={activeImage.alt} className="max-h-full max-w-full object-contain" data-testid="image-viewer-current" />
              <button type="button" onClick={showNextImage} className="absolute right-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/35 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6 sm:h-14 sm:w-14" aria-label={uiText(locale, 'Image suivante', 'Next image')} data-testid="button-next-image"><ArrowRight size={22} /></button>
            </div>
            <div className="border-t border-white/10 px-5 py-3 text-center">
              <DialogDescription className="mx-auto max-w-4xl text-sm leading-6 text-white/75">{activeImage.alt}</DialogDescription>
              <p className="mt-1 text-[11px] text-white/45">{uiText(locale, 'Utilisez les flèches, les touches ← → ou le glissement sur mobile.', 'Use the arrows, ← → keys, or swipe on mobile.')}</p>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </section><RelatedPages content={content} current="galerie" /></main></SiteShell>;
}

export function ReviewsPage({ content }: { content: SiteContent }) {
  const locale = useSiteLocale();
  const publicReviews = usePublicReviews();
  const testimonials = combinePublicReviews(publicReviews.data ?? [], content.testimonials);
  return <SiteShell clinic={content.clinic} content={content}><main><PageIntro eyebrow={uiText(locale, 'Vos mots comptent', 'Your experience matters')} title={uiText(locale, 'La confiance se construit ensemble.', 'Trust is built together.')} text={uiText(locale, 'Découvrez les expériences partagées par les visiteurs du cabinet. Votre retour nous aide à mieux vous accueillir.', 'Read experiences shared by visitors to the practice. Your feedback helps us understand how we can welcome you.')} />
    <section className="wrap section-pad">
      <div className="mb-12"><ReviewTrustPanel testimonials={content.testimonials} ctaHref="#laisser-un-avis" ctaLabel={uiText(locale, 'Laisser un avis', 'Leave a review')} /></div>
      {publicReviews.isError && <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm" role="alert" data-testid="status-public-reviews-error">
        <p>{uiText(locale, 'Les avis visiteurs ne sont pas disponibles pour le moment. Les témoignages du cabinet restent affichés.', 'Visitor reviews are temporarily unavailable. Existing practice testimonials remain visible.')}</p>
        <button type="button" onClick={() => void publicReviews.refetch()} className="mt-2 font-semibold text-destructive underline" data-testid="button-retry-public-reviews">{uiText(locale, 'Réessayer', 'Try again')}</button>
      </div>}
      {publicReviews.isLoading && <p className="mb-6 text-center text-sm text-muted-foreground" role="status" data-testid="status-public-reviews-loading">{uiText(locale, 'Chargement des avis…', 'Loading reviews…')}</p>}
      <ReviewCarousel reviews={testimonials} id="reviews-page" />
      <div id="laisser-un-avis" className="mx-auto mt-14 max-w-3xl scroll-mt-32 border-t border-border pt-12">
        <ReviewSubmissionForm />
      </div>
      <div className="mt-12 text-center"><ActionLink href="/contact" testId="link-reviews-contact">{uiText(locale, 'Nous contacter', 'Contact us')}</ActionLink></div>
    </section><RelatedPages content={content} current="avis" /></main></SiteShell>;
}

export function FAQPage({ content }: { content: SiteContent }) {
  const locale = useSiteLocale();
  const displayFaqs = faqsForDisplay(content.faqs);
  return <SiteShell clinic={content.clinic} content={content}><main><PageIntro eyebrow={uiText(locale, 'Questions fréquentes', 'Frequently asked questions')} title={uiText(locale, 'Les réponses, sans détour.', 'Straightforward answers.')} text={uiText(locale, 'Vous préparer à votre visite, c’est déjà prendre soin de vous. Voici les réponses aux questions que l’on nous pose souvent.', 'Knowing what to expect can help you prepare for a visit. Here are answers to some common questions.')} />
    <section className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">{displayFaqs.length ? <FaqList faqs={displayFaqs} /> : <EmptyInline title={uiText(locale, 'Une question particulière ?', 'Have a specific question?')} text={uiText(locale, 'Contactez-nous, nous serons heureux de vous répondre.', 'Contact us and we will be glad to help.')} />}
      <div className="mt-12 rounded-md bg-[#073e53] p-8 text-white"><h2 className="font-display text-2xl font-semibold">{uiText(locale, 'Votre question n’est pas ici ?', 'Did not find your answer?')}</h2><p className="mt-2 text-sm text-white/70">{uiText(locale, 'Notre équipe est à votre écoute.', 'Our team is here to listen.')}</p><div className="mt-5"><ActionLink href="/contact" testId="link-faq-contact">{uiText(locale, 'Nous contacter', 'Contact us')}</ActionLink></div></div>
    </section></main></SiteShell>;
}

const blogImageAlt: Record<string, string> = {
  'urgence-dentaire-douala': 'Illustration d’un examen dentaire lié à une douleur dentaire.',
  'detartrage-et-polissage': 'Illustration d’un soin d’hygiène dentaire et de détartrage.',
  'kinesitherapie-maxillo-faciale': 'Illustration d’un exercice de mobilité maxillo-faciale.',
  'grossesse-et-sante-bucco-dentaire': 'Illustration d’une consultation en maternité au sujet de la santé bucco-dentaire.',
};
const articleImageAlt = (post: BlogPost, locale: 'fr' | 'en') => locale === 'en'
  ? englishBlogPost(post).imageAlt
  : blogImageAlt[post.id] || `Illustration dentaire liée à l’article : ${post.title}`;

function renderArticleText(text: string) {
  return text.split(/(https:\/\/[^\s<>]+)/g).map((part, index) => part.startsWith('https://')
    ? <a key={`${index}-${part}`} href={part} target="_blank" rel="noopener noreferrer" className="break-words font-medium text-[#073e53] underline underline-offset-4">{part}</a>
    : <span key={index}>{part}</span>);
}

function BlogCard({ post }: { post: BlogPost }) {
  const locale = useSiteLocale();
  const translated = englishBlogPost(post);
  const title = cmsText(locale, post.title, translated.title);
  const excerpt = cmsText(locale, post.excerpt, translated.excerpt);
  const author = cmsText(locale, post.author, translated.author);
  const slug = locale === 'en' ? translated.slug : post.slug;
  return <article className="card-ref overflow-hidden" data-testid={`card-blog-${post.id}`}><Link href={locale === 'en' ? `/en/blog/${slug}/` : `/blog/${slug}/`} className="block" data-testid={`link-blog-${post.slug}`}><ImageFrame src={post.imageUrl} alt={articleImageAlt(post, locale)} label={uiText(locale, 'Illustration de l’article', 'Article illustration')} indicator={title} details={excerpt} className="h-52" /><div className="p-6"><p className="text-[10px] uppercase tracking-[.16em] text-accent">{post.date} · {author}</p><h2 className="mt-3 font-display text-xl font-medium leading-snug text-[#073e53]">{title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{excerpt}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-accent">{uiText(locale, 'Lire l’article', 'Read article')} <ArrowRight size={14} /></span></div></Link></article>;
}

export function BlogPage({ content }: { content: SiteContent }) {
  const locale = useSiteLocale();
  const posts = content.blogPosts.filter((p) => p.published).sort((a, b) => b.date.localeCompare(a.date));
  return <SiteShell clinic={content.clinic} content={content}><main><PageIntro eyebrow={uiText(locale, 'Conseils dentaires à Douala', 'Dental information in Douala')} title={uiText(locale, 'Quelques repères pour votre sourire.', 'A few notes for your smile.')} text={uiText(locale, 'Des informations générales sur les soins dentaires et la santé bucco-dentaire, à compléter par les conseils de votre praticien.', 'General information about dental care and oral health. It is not a substitute for advice from your practitioner.')} />
    <section className="wrap section-pad">{posts.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{posts.map((p) => <BlogCard key={p.id} post={p} />)}</div> : <EmptyInline title={uiText(locale, 'Le carnet prend forme', 'The journal is taking shape')} text={uiText(locale, 'Nos premiers conseils et articles seront publiés prochainement.', 'The first articles and information will be published here soon.')} />}</section><RelatedPages content={content} current="blog" /></main></SiteShell>;
}

export function BlogArticlePage({ content, slug }: { content: SiteContent; slug?: string }) {
  const locale = useSiteLocale();
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'failure'>('idle');
  const post = content.blogPosts.find((c) => (c.slug === slug || c.slugEn === slug || englishBlogPost(c).slug === slug) && c.published);
  if (!post) return <SiteShell clinic={content.clinic} content={content}><main className="mx-auto max-w-3xl px-5 py-24 text-center"><p className="eyebrow">{uiText(locale, 'Article introuvable', 'Article not found')}</p><h1 className="mt-4 font-display text-4xl font-semibold text-[#073e53]">{uiText(locale, 'Ce carnet n’a pas encore cette page.', 'This article is not available.')}</h1><div className="mt-7"><ActionLink href="/blog" testId="link-article-back">{uiText(locale, 'Retour au carnet', 'Back to articles')}</ActionLink></div></main></SiteShell>;
  const translated = englishBlogPost(post);
  const body = locale === 'en' ? translated.content : post.content;
  const blocks = (body ?? '').split(/\n{2,}/).flatMap((block) => {
    const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return [];
    if (lines[0].startsWith('## ')) {
      const heading = { type: 'heading' as const, text: lines[0].replace(/^##\s+/, '') };
      const paragraph = lines.slice(1).join(' ').trim();
      return paragraph ? [heading, { type: 'paragraph' as const, text: paragraph }] : [heading];
    }
    return [{ type: 'paragraph' as const, text: lines.join(' ') }];
  });
  const readingMinutes = Math.max(1, Math.ceil((body ?? '').trim().split(/\s+/).filter(Boolean).length / 200));
  const title = cmsText(locale, post.title, translated.title);
  const excerpt = cmsText(locale, post.excerpt, translated.excerpt);
  const author = cmsText(locale, post.author, translated.author);
  const articleUrl = typeof window === 'undefined' ? '' : (() => {
    const current = new URL(window.location.href);
    current.search = '';
    current.hash = '';
    return current.href;
  })();
  const shareTitle = encodeURIComponent(title);
  const shareUrl = encodeURIComponent(articleUrl);
  const shareLinks = [
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${title} ${articleUrl}`)}`, icon: <SiWhatsapp size={17} aria-hidden="true" /> },
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, icon: <SiFacebook size={17} aria-hidden="true" /> },
    { id: 'gmail', label: 'Gmail', href: `https://mail.google.com/mail/?view=cm&fs=1&su=${shareTitle}&body=${shareUrl}`, icon: <Mail size={17} aria-hidden="true" /> },
  ];
  async function copyArticleUrl() {
    try {
      if (!articleUrl) throw new Error('Article URL unavailable');
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(articleUrl);
          setCopyState('success');
          return;
        } catch {
          // Fall back for browsers that deny clipboard access.
        }
      }
      const field = document.createElement('textarea');
      field.value = articleUrl;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      field.style.left = '-9999px';
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      if (!copied) throw new Error('Clipboard unavailable');
      setCopyState('success');
    } catch {
      setCopyState('failure');
    }
  }
  const relatedServiceSlugs = new Set((post.relatedServiceSlugs ?? '').split(/[,\n]+/).map((value) => value.trim()).filter(Boolean));
  const relatedArticleSlugs = new Set((post.relatedArticleSlugs ?? '').split(/[,\n]+/).map((value) => value.trim()).filter(Boolean));
  const relatedServices = content.services.filter((service) => relatedServiceSlugs.has(service.slug));
  const relatedArticles = content.blogPosts.filter((article) =>
    article.published
    && article.slug !== post.slug
    && (relatedArticleSlugs.has(article.slug) || relatedArticleSlugs.has(article.slugEn ?? '') || relatedArticleSlugs.has(englishBlogPost(article).slug)),
  );
  return <SiteShell clinic={content.clinic} content={content}><main><article className="blog-editorial mx-auto max-w-4xl px-5 pb-24 pt-12 md:px-8 md:pt-16">
    <section className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#073e53]/10 bg-[#f8f8f2] px-5 py-4" aria-label={uiText(locale, 'Navigation des articles', 'Article navigation')} data-testid="article-back-top">
      <div><p className="text-[9px] font-semibold uppercase tracking-[.18em] text-accent">{uiText(locale, 'Le carnet du cabinet', 'Practice journal')}</p><p className="mt-1 text-xs text-muted-foreground">{uiText(locale, 'Poursuivre la lecture à votre rythme.', 'Continue reading at your own pace.')}</p></div>
      <Link href={routeFor('/blog/', locale, content)} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#073e53]/20 bg-white px-4 text-xs font-semibold text-[#073e53] hover:border-accent hover:text-accent" data-testid="link-back-blog"><ArrowLeft size={15} /> {uiText(locale, 'Tous les articles', 'All articles')}</Link>
    </section>
    <header className="blog-editorial-header mt-10">
      <h1 className="blog-editorial-title">{title}</h1>
      <p className="blog-editorial-excerpt">{excerpt}</p>
      <div className="blog-editorial-meta" aria-label={uiText(locale, 'Informations sur l’article', 'Article information')}>
        <span>{uiText(locale, 'Par', 'By')} <strong>{author}</strong></span>
        <span aria-hidden="true">·</span>
        <span>{readingMinutes} {uiText(locale, 'min de lecture', 'min read')}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={post.date}>{post.date}</time>
      </div>
    </header>
    <ImageFrame src={post.imageUrl} alt={articleImageAlt(post, locale)} label={uiText(locale, 'Illustration de l’article', 'Article illustration')} indicator={uiText(locale, 'Conseil dentaire', 'Dental information')} details={title} className="mt-8 h-[280px] rounded-md md:mt-10 md:h-[440px]" priority />
    <div className="blog-article-prose mt-10 max-w-none">{blocks.length ? blocks.map((block, index) => block.type === 'heading' ? <h2 key={`${block.type}-${index}`}>{block.text}</h2> : <p key={`${block.type}-${index}`}>{renderArticleText(block.text)}</p>) : <p>{uiText(locale, 'Le contenu de cet article sera bientôt disponible.', 'English translation not yet available.')}</p>}</div>
    <section className="mt-10 rounded-2xl border border-[#073e53]/10 bg-white p-6 shadow-[0_12px_40px_rgba(7,1,22,.05)] md:p-8" aria-labelledby="article-share-title" data-testid="article-share-section">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-accent">{uiText(locale, 'À partager', 'Pass it along')}</p><h2 id="article-share-title" className="mt-2 font-display text-2xl font-medium text-[#073e53]">{uiText(locale, 'Transmettre cet article', 'Share this article')}</h2></div>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">{uiText(locale, 'Une information utile peut aussi aider quelqu’un autour de vous.', 'Useful information can help someone around you, too.')}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2" data-testid="article-share-actions">
        {shareLinks.map((share, index) => <a key={share.id} href={share.href} target="_blank" rel="noopener noreferrer" aria-label={`${uiText(locale, 'Partager sur', 'Share on')} ${share.label}`} className="share-action inline-flex min-h-11 items-center gap-2 rounded-full border border-[#073e53]/15 bg-[#f8f8f2] px-4 text-xs font-semibold text-[#073e53] hover:-translate-y-0.5 hover:border-accent hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" style={{ animationDelay: `${index * 70}ms` }} data-testid={`button-share-${share.id}`}>{share.icon}<span>{share.label}</span></a>)}
        <button type="button" onClick={() => void copyArticleUrl()} aria-label={uiText(locale, 'Copier le lien de cet article', 'Copy this article link')} className="share-action inline-flex min-h-11 items-center gap-2 rounded-full border border-[#073e53]/15 bg-[#f8f8f2] px-4 text-xs font-semibold text-[#073e53] hover:-translate-y-0.5 hover:border-accent hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" style={{ animationDelay: '210ms' }} data-testid="button-share-copy"><Link2 size={16} aria-hidden="true" />{uiText(locale, 'Copier le lien', 'Copy link')}</button>
      </div>
      {copyState !== 'idle' && <p className={`mt-4 text-xs ${copyState === 'success' ? 'text-[#466536]' : 'text-[#943d35]'}`} role={copyState === 'failure' ? 'alert' : 'status'} aria-live="polite" data-testid="status-copy-article-url">{copyState === 'success' ? uiText(locale, 'Lien copié dans le presse-papiers.', 'Link copied to the clipboard.') : uiText(locale, 'Impossible de copier le lien. Vous pouvez copier l’adresse depuis la barre du navigateur.', 'Could not copy the link. You can copy the address from your browser bar.')}</p>}
    </section>
    {(relatedServices.length > 0 || relatedArticles.length > 0) && <section className="mt-12 rounded-2xl border border-[#073e53]/10 bg-[#f8f8f2] p-6 md:p-8" aria-labelledby="related-reading-title" data-testid="blog-related-links">
      <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-accent">{uiText(locale, 'Pour continuer', 'Continue reading')}</p>
      <h2 id="related-reading-title" className="mt-2 font-display text-2xl font-medium text-[#073e53]">{uiText(locale, 'Soins et conseils associés', 'Related care and advice')}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {relatedServices.map((service) => {
          const english = englishService(service);
          const serviceTitle = cmsText(locale, service.title, english.title);
          return <Link key={`service-${service.id}`} href={routeFor(`/soins/${service.slug}/`, locale, content)} className="group rounded-xl border border-[#073e53]/10 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md" data-testid={`related-service-${service.slug}`}>
            <span className="text-[9px] font-semibold uppercase tracking-[.16em] text-accent">{uiText(locale, 'Soin', 'Care')}</span>
            <span className="mt-2 flex items-center justify-between gap-3 font-display text-lg font-medium text-[#073e53]">{serviceTitle}<ArrowRight size={16} className="shrink-0 transition-transform group-hover:translate-x-1" /></span>
          </Link>;
        })}
        {relatedArticles.map((article) => {
          const english = englishBlogPost(article);
          const articleTitle = cmsText(locale, article.title, english.title);
          const articleSlug = locale === 'en' ? english.slug : article.slug;
          return <Link key={`article-${article.id}`} href={routeFor(`/blog/${articleSlug}/`, locale, content)} className="group rounded-xl border border-[#073e53]/10 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md" data-testid={`related-article-${article.slug}`}>
            <span className="text-[9px] font-semibold uppercase tracking-[.16em] text-accent">{uiText(locale, 'Conseil associé', 'Related advice')}</span>
            <span className="mt-2 flex items-center justify-between gap-3 font-display text-lg font-medium text-[#073e53]">{articleTitle}<ArrowRight size={16} className="shrink-0 transition-transform group-hover:translate-x-1" /></span>
          </Link>;
        })}
      </div>
    </section>}
    <aside className="mt-12 rounded-2xl border border-[#073e53]/10 bg-white p-6 shadow-[0_12px_40px_rgba(7,1,22,.06)] md:p-8">
      <h2 className="font-display text-2xl font-medium text-[#073e53]">{uiText(locale, 'Une question sur votre situation ?', 'Have a question about your situation?')}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{uiText(locale, 'Un article ne remplace pas un examen. Contactez le cabinet pour demander un rendez-vous ou poser une question générale.', 'An article cannot replace an examination. Contact the practice to request an appointment or ask a general question.')}</p>
      <Link href={routeFor('/contact/', locale, content)} className="btn-gold mt-5 inline-flex" data-testid="link-blog-contact">{uiText(locale, 'Contacter le cabinet', 'Contact the practice')}</Link>
    </aside>
    <section className="mt-12 flex flex-col justify-between gap-4 border-t border-[#073e53]/15 pt-8 sm:flex-row sm:items-center" aria-label={uiText(locale, 'Retour à la liste des articles', 'Return to the articles list')} data-testid="article-back-bottom">
      <div><p className="font-display text-xl font-medium text-[#073e53]">{uiText(locale, 'La suite de votre lecture vous attend.', 'More reading is waiting for you.')}</p><p className="mt-1 text-sm text-muted-foreground">{uiText(locale, 'Retrouvez tous les conseils et informations du cabinet.', 'Browse all the practice’s advice and information.')}</p></div>
      <Link href={routeFor('/blog/', locale, content)} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#073e53] px-5 text-xs font-semibold text-white hover:bg-accent" data-testid="link-back-blog-bottom"><ArrowLeft size={15} /> {uiText(locale, 'Retour aux articles', 'Back to articles')}</Link>
    </section>
  </article></main></SiteShell>;
}

function CampaignGrid({ campaigns }: { campaigns: Campaign[] }) {
  const locale = useSiteLocale();
  return <div className="grid gap-6 md:grid-cols-2">{campaigns.map((c) => {
    const videoUrl = c.videoUrl?.trim();
    const hasVideo = c.mediaType === 'video' && !!videoUrl;
    const title = cmsText(locale, c.title, c.titleEn);
    const description = cmsText(locale, c.description, c.descriptionEn);
    const poster = c.imageUrl?.trim() || (videoUrl ? getYouTubeThumbnailUrl(videoUrl) : null) || undefined;
    const transcript = locale === 'en' ? c.transcriptEn?.trim() : c.transcript?.trim();
    const publishedAt = c.publishedAt && !Number.isNaN(Date.parse(c.publishedAt)) ? new Date(c.publishedAt) : null;
    return <article key={c.id} className="card-ref overflow-hidden" data-testid={`card-campaign-${c.id}`}>
      <div className="relative">
        {hasVideo
          ? <VideoPlayer
            src={videoUrl}
            poster={poster}
            title={locale === 'en' ? `Campaign video: ${title}` : `Vidéo de la campagne : ${title}`}
            className="h-60"
            testId={`video-campaign-${c.id}`}
          />
          : <ImageFrame src={c.imageUrl} alt={title} label={c.mediaType === 'video' ? uiText(locale, 'Miniature vidéo à ajouter', 'Video thumbnail') : uiText(locale, 'Visuel à ajouter', 'Campaign image')} indicator={title} details={description} className="h-60" />}
      </div>
      <div className="p-6">
        <h2 className="font-display text-xl font-semibold text-[#073e53]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {publishedAt && <time className="mt-3 block text-xs text-muted-foreground" dateTime={publishedAt.toISOString()}>{new Intl.DateTimeFormat(locale === 'en' ? 'en' : 'fr-FR', { dateStyle: 'long' }).format(publishedAt)}</time>}
        {hasVideo && transcript && <details className="mt-4 rounded-xl border border-[#073e53]/15 bg-white/80 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#073e53]">{uiText(locale, 'Lire la transcription de la vidéo', 'Read the video transcript')}</summary>
          <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">{transcript.split(/\n{2,}/).map((paragraph, index) => <p key={`${c.id}-transcript-${index}`}>{paragraph}</p>)}</div>
        </details>}
      </div>
    </article>;
  })}</div>;
}

export function InformationPage({ content }: { content: SiteContent }) {
  const locale = useSiteLocale();
  const campaigns = content.campaigns.filter((c) => c.active);
  const city = content.clinic.city?.trim() || 'Douala';
  return <SiteShell clinic={content.clinic} content={content}><main>
    <PageIntro
      eyebrow={uiText(locale, 'Actualités du cabinet', 'Practice updates')}
      title={locale === 'en' ? `Dental practice news and videos in ${city}` : `Actualités et vidéos du cabinet dentaire à ${city}`}
      text={locale === 'en'
        ? `Watch practice videos and read current campaigns and updates from the dental team in ${city}.`
        : `Regardez les vidéos du cabinet et consultez les campagnes et actualités partagées par l’équipe dentaire à ${city}.`}
    />
    <section className="wrap section-pad" aria-label={uiText(locale, 'Actualités, campagnes et vidéos', 'News, campaigns and videos')} data-testid="information-content">
      {campaigns.length ? <CampaignGrid campaigns={campaigns} /> : <EmptyInline title={uiText(locale, 'Rien de nouveau pour le moment', 'Nothing new just yet')} text={uiText(locale, 'Les actualités et vidéos du cabinet seront publiées ici dès qu’elles seront disponibles.', 'Practice news and videos will appear here when available.')} />}
    </section>
    <RelatedPages content={content} current="informations" />
  </main></SiteShell>;
}

export function ContactPage({ content }: { content: SiteContent }) {
  const locale = useSiteLocale();
  const clinic = content.clinic;
  const row = (icon: ReactNode, label: string, value: ReactNode) => <><span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white/10 text-[#f0a0a6]">{icon}</span><span><b className="block font-semibold">{label}</b><span className="mt-1 block whitespace-pre-line text-white/70">{value}</span></span></>;
  return <SiteShell clinic={clinic} content={content}><main><PageIntro eyebrow={uiText(locale, 'Prenons le temps d’échanger', 'Let’s talk')} title={uiText(locale, 'Nous sommes tout près.', 'We are here to help.')} text={uiText(locale, 'Un rendez-vous, une question, un besoin d’orientation ? Contactez-nous comme vous le souhaitez.', 'Have a question or need information about an appointment? Contact the practice in the way that suits you.')} />
    <section className="wrap section-pad grid gap-7 md:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-md bg-[#073e53] p-7 text-white md:p-10"><p className="text-[11px] uppercase tracking-[.24em] text-[#f0a0a6]">{safeName(clinic.name)} · {safeCity(clinic.city)}</p><h2 className="mt-4 font-display text-3xl font-semibold">{uiText(locale, 'À votre écoute.', 'We are listening.')}</h2><div className="mt-8 space-y-6 text-sm">
        <a href={`tel:${clinic.phone}`} className="flex items-start gap-4" data-testid="link-contact-phone">{row(<Phone size={17} />, uiText(locale, 'Téléphone', 'Phone'), clinic.phone || uiText(locale, 'À renseigner', 'To be added'))}</a>
        <a href={`mailto:${PRACTICE_CONTACT_EMAIL}`} className="flex items-start gap-4" data-testid="link-contact-email">{row(<MessageCircle size={17} />, uiText(locale, 'Courriel', 'Email'), PRACTICE_CONTACT_EMAIL)}</a>
        <div className="flex items-start gap-4" data-testid="text-contact-address">{row(<MapPin size={17} />, uiText(locale, 'Adresse', 'Address'), clinic.address ? (locale === 'en' ? `Address supplied by the practice (not translated): ${clinic.address}` : clinic.address) : uiText(locale, 'Douala, Cameroun', 'Douala, Cameroon'))}</div>
        <div className="flex items-start gap-4 whitespace-pre-line" data-testid="text-contact-hours">{row(<Clock3 size={17} />, uiText(locale, 'Horaires', 'Hours'), hoursLabel(clinic, locale))}</div>
      </div><div className="mt-9"><BookButton clinic={clinic} testId="button-contact-book">{uiText(locale, 'Demander un rendez-vous', 'Request an appointment')}</BookButton></div></div>
      <div className="card-ref p-6 md:p-9">
        <p className="eyebrow">{uiText(locale, 'À votre rythme', 'At your pace')}</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-[#073e53] md:text-3xl">{uiText(locale, 'Faire une demande de rendez-vous', 'Send an appointment request')}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{uiText(locale, 'L’équipe vous recontactera pour convenir d’un créneau adapté.', 'The team will contact you to discuss a suitable time.')}</p>
        <AppointmentRequestForm phone={clinic.phone} />
      </div>
    </section>
    <section className="wrap grid gap-8 pb-14 md:grid-cols-[1.2fr_.8fr] md:gap-10" aria-labelledby="quick-question-title" data-testid="contact-quick-question">
      <div>
        <h2 id="quick-question-title" className="font-display text-2xl font-semibold text-[#20213e] md:text-3xl">{uiText(locale, 'Une question rapide ?', 'A quick question?')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{uiText(locale, 'Pas besoin de prendre RDV — écrivez-nous simplement.', 'No appointment needed — simply write to us.')}</p>
         <QuickContactForm phone={clinic.phone} />
      </div>
      <aside aria-labelledby="contact-social-title">
        <h2 id="contact-social-title" className="font-display text-2xl font-semibold text-[#20213e] md:text-3xl">{uiText(locale, 'Suivez-nous', 'Follow us')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{uiText(locale, 'Découvrez nos derniers cas, conseils et coulisses.', 'Discover our latest cases, advice and behind-the-scenes moments.')}</p>
        <div className="mt-5"><SocialLinks links={content.socialLinks} variant="contact" /></div>
      </aside>
    </section>
    <section className="wrap pb-16">
      <div className="card-ref flex min-h-[280px] flex-col overflow-hidden">
        <iframe title={uiText(locale, 'Carte pour rejoindre la Clinique La Bienveillance à Douala', 'Map to Clinique La Bienveillance in Douala')} src={mapEmbedUrl} loading="lazy" className="h-[360px] w-full border-0" referrerPolicy="no-referrer-when-downgrade" data-testid="map-contact" />
        <div className="flex flex-wrap items-center justify-between gap-3 p-4"><p className="text-xs text-muted-foreground">{uiText(locale, 'Ancienne gare routière, Dakar, Douala, Cameroun', 'Address supplied by the practice: Ancienne gare routière, Dakar, Douala, Cameroon')}</p><a href={clinic.mapUrl || mapsDirections} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-semibold text-[#073e53] hover:underline" data-testid="link-contact-directions">{uiText(locale, 'Ouvrir dans Google Maps', 'Open in Google Maps')} <ArrowRight size={14} /></a></div>
      </div>
    </section>
  </main></SiteShell>;
}
