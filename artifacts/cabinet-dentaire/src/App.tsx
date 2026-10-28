import { useEffect, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Clock3,
  HeartHandshake, Image as ImageIcon, MapPin, Menu, MessageCircle,
  Phone, Play, Plus, Quote, ShieldCheck, Trash2, X,
} from 'lucide-react';
import {
  getGetAdminAccessQueryKey, getGetSiteContentQueryKey, useGetAdminAccess,
  useGetSiteContent, useUpdateSiteContent,
} from '@workspace/api-client-react';
import type { BlogPost, Campaign, ServiceItem, SiteContent, Testimonial } from '@workspace/api-client-react';
import { Route, Switch, Link, Router as WouterRouter, useLocation } from 'wouter';
import NotFound from '@/pages/not-found';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const navItems = [
  ['Soins', '/soins'], ['Notre équipe', '/equipe'], ['Le cabinet', '/galerie'],
  ['Avis', '/avis'], ['Conseils', '/blog'], ['FAQ', '/faq'],
] as const;

const safeName = (name?: string) => name?.trim() || 'Cabinet Naya';
const safeCity = (city?: string) => city?.trim() || 'Douala';

function LogoWordmark({ clinic, inverse = false }: { clinic?: SiteContent['clinic']; inverse?: boolean }) {
  return <Link href="/" className={`inline-flex items-center gap-3 ${inverse ? 'text-[#f7f3e9]' : 'text-foreground'}`} data-testid="link-home-brand">
    {clinic?.logoUrl?.trim() && <img src={clinic.logoUrl} alt={`${safeName(clinic.name)} logo`} className="h-10 w-10 rounded-full object-contain" data-testid="img-clinic-logo" />}
    <span className="flex flex-col leading-none">
      <span className="font-display text-[19px] tracking-[-.04em]">{safeName(clinic?.name)}</span>
      <span className={`mt-1 text-[9px] uppercase tracking-[.23em] ${inverse ? 'text-white/60' : 'text-muted-foreground'}`}>{safeCity(clinic?.city)}</span>
    </span>
  </Link>;
}

function Header({ clinic }: { clinic?: SiteContent['clinic'] }) {
  const [open, setOpen] = useState(false);
  return <header className="relative z-30 border-b border-foreground/10 bg-background/95 backdrop-blur-md">
    <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 md:px-10 lg:px-14">
      <LogoWordmark clinic={clinic} />
      <nav aria-label="Navigation principale" className="hidden items-center gap-7 lg:flex">
        {navItems.map(([label, href]) => <Link key={href} href={href} className="text-[12px] font-medium text-foreground/75 transition-colors hover:text-primary" data-testid={`nav-${href.slice(1)}`}>{label}</Link>)}
      </nav>
      <div className="hidden items-center gap-5 lg:flex">
        <Link href="/informations" className="text-xs font-medium text-foreground/70 hover:text-primary" data-testid="nav-informations">Informations</Link>
        <Link href="/contact" className="rounded-full bg-primary px-5 py-3 text-[11px] font-semibold uppercase tracking-[.13em] text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="button-header-rendez-vous">Prendre rendez-vous <ArrowUpRight className="ml-2 inline h-3.5 w-3.5" /></Link>
      </div>
      <button type="button" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open} onClick={() => setOpen(!open)} className="grid h-10 w-10 place-items-center rounded-full border border-border lg:hidden" data-testid="button-menu-mobile">{open ? <X size={19} /> : <Menu size={19} />}</button>
    </div>
    {open && <nav aria-label="Navigation mobile" className="absolute inset-x-0 top-full border-b border-border bg-background px-5 pb-5 pt-2 shadow-lg lg:hidden">
      {[...navItems, ['Informations', '/informations'] as const, ['Contact', '/contact'] as const].map(([label, href]) => <Link onClick={() => setOpen(false)} key={href} href={href} className="block border-t border-border/70 py-3 text-sm" data-testid={`mobile-nav-${href.slice(1)}`}>{label}</Link>)}
    </nav>}
  </header>;
}

function Footer({ clinic }: { clinic?: SiteContent['clinic'] }) {
  return <footer className="bg-[#183c35] text-[#f7f3e9]">
    <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-14 md:grid-cols-[1.1fr_.8fr_.8fr] md:px-10 lg:px-14 lg:py-20">
      <div><LogoWordmark clinic={clinic} inverse /><p className="mt-6 max-w-sm text-sm leading-7 text-[#d0dbd3]">Un lieu de soin où l’on prend le temps de vous écouter, de vous expliquer et de vous accompagner.</p></div>
      <div><p className="mb-5 text-[10px] uppercase tracking-[.22em] text-[#c7a98b]">Nous trouver</p><p className="text-sm leading-7 text-[#e6e9e2]">{clinic?.address || 'Douala, Cameroun'}<br />{safeCity(clinic?.city)}</p><a href={clinic?.mapUrl || 'https://maps.google.com/?q=Douala'} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs text-[#d9b89a] hover:text-white" data-testid="link-footer-map">Itinéraire <ArrowUpRight size={14} /></a></div>
      <div><p className="mb-5 text-[10px] uppercase tracking-[.22em] text-[#c7a98b]">Un premier échange</p><a href={`tel:${clinic?.phone || ''}`} className="block text-lg font-medium" data-testid="link-footer-phone">{clinic?.phone || 'Contactez-nous'}</a><a href={`mailto:${clinic?.email || ''}`} className="mt-2 block text-sm text-[#d0dbd3]" data-testid="link-footer-email">{clinic?.email || 'Adresse à renseigner'}</a><p className="mt-4 whitespace-pre-line text-xs leading-6 text-[#d0dbd3]">{clinic?.openingHours || 'Horaires à renseigner'}</p></div>
    </div>
    <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-3 border-t border-white/15 px-5 py-5 text-[10px] text-white/60 md:flex-row md:px-10 lg:px-14"><span>© {new Date().getFullYear()} {safeName(clinic?.name)} · Douala</span><span>Une présence attentive, un sourire à la fois.</span></div>
  </footer>;
}

function SiteShell({ children, clinic }: { children: ReactNode; clinic?: SiteContent['clinic'] }) {
  return <div className="site-grain min-h-[100dvh] bg-background text-foreground"><Header clinic={clinic} />{children}<Footer clinic={clinic} /></div>;
}

function LoadingPage() {
  return <div className="mx-auto max-w-6xl px-5 py-24" aria-label="Chargement du site">
    <div className="h-3 w-32 animate-pulse rounded bg-secondary" />
    <div className="mt-8 h-14 max-w-2xl animate-pulse rounded bg-secondary/80" />
    <div className="mt-4 h-5 max-w-xl animate-pulse rounded bg-secondary/60" />
    <div className="mt-12 grid gap-5 md:grid-cols-3">{[1, 2, 3].map((n) => <div key={n} className="h-56 animate-pulse rounded-3xl bg-secondary/60" />)}</div>
  </div>;
}

function FetchError({ retry }: { retry: () => void }) {
  return <div className="mx-auto my-20 max-w-xl rounded-[28px] border border-border bg-card p-8 text-center" role="alert" data-testid="error-site-content">
    <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary"><HeartHandshake size={22} /></span>
    <h2 className="mt-5 font-display text-2xl">Nous revenons dans un instant</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Le site n’a pas pu charger ses informations. Réessayez dans quelques secondes.</p>
    <button onClick={retry} className="mt-6 rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground" data-testid="button-retry-content">Réessayer</button>
  </div>;
}

function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <section className="mx-auto max-w-7xl px-5 pb-12 pt-14 md:px-10 md:pb-16 md:pt-20 lg:px-14">
    <p className="mb-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.25em] text-primary"><span className="h-px w-8 bg-accent" />{eyebrow}</p>
    <h1 className="max-w-4xl font-display text-4xl leading-[1.08] tracking-[-.04em] md:text-6xl">{title}</h1>
    <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">{text}</p>
  </section>;
}

function ImageFrame({ src, alt, className = '', label = 'Photographie à ajouter' }: { src?: string; alt: string; className?: string; label?: string }) {
  return <div className={`image-empty relative overflow-hidden ${className}`}>
    {src?.trim() ? <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" /> : <div className="absolute inset-0 grid place-items-center p-6 text-center">
      <div className="flex flex-col items-center text-primary/70"><ImageIcon size={24} strokeWidth={1.2} /><span className="mt-3 max-w-[180px] text-[9px] uppercase tracking-[.2em]">{label}</span></div>
      <span aria-hidden className="absolute -bottom-10 -right-5 h-40 w-40 rounded-full border border-primary/15" />
    </div>}
  </div>;
}

function ActionLink({ href, children, secondary = false, testId }: { href: string; children: ReactNode; secondary?: boolean; testId: string }) {
  return <Link href={href} data-testid={testId} className={secondary
    ? 'inline-flex items-center gap-3 border-b border-foreground/35 pb-2 text-xs font-semibold tracking-wide transition-colors hover:border-primary hover:text-primary'
    : 'inline-flex items-center gap-3 rounded-full bg-primary px-6 py-4 text-xs font-semibold uppercase tracking-[.13em] text-primary-foreground transition-transform hover:-translate-y-0.5'}>{children}{secondary ? <ArrowRight size={15} /> : <ArrowUpRight size={15} />}</Link>;
}

function HomePage({ content }: { content: SiteContent }) {
  const activeCampaigns = content.campaigns.filter((campaign) => campaign.active);
  return <SiteShell clinic={content.clinic}>
    <main>
      <section className="relative mx-auto grid max-w-[1440px] items-center gap-10 overflow-hidden px-5 pb-14 pt-12 md:min-h-[630px] md:grid-cols-[1fr_.94fr] md:px-10 md:py-20 lg:px-14 lg:py-24">
        <div className="pointer-events-none absolute -left-28 top-10 h-96 w-96 rounded-full border border-accent/25" /><div className="pointer-events-none absolute -left-10 top-28 h-60 w-60 rounded-full border border-accent/20" />
        <div className="relative z-10 reveal">
          <p className="mb-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.26em] text-primary"><span className="h-px w-9 bg-accent" />{content.hero.eyebrow || 'Le soin, à votre rythme'}</p>
          <h1 className="max-w-[700px] font-display text-[clamp(3rem,7vw,6.2rem)] leading-[.98] tracking-[-.055em]">{content.hero.title || <>Un sourire en confiance.<br /><i className="font-medium text-primary">Un soin tout en douceur.</i></>}</h1>
          <p className="mt-7 max-w-lg text-[15px] leading-7 text-muted-foreground">{content.hero.description || 'À Douala, nous avons imaginé un cabinet où chaque visite commence par une écoute attentive. Vous êtes chez vous, nous prenons soin du reste.'}</p>
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <a href={content.clinic.bookingUrl || `tel:${content.clinic.phone || ''}`} target={content.clinic.bookingUrl ? '_blank' : undefined} rel="noreferrer" className="inline-flex items-center gap-3 rounded-full bg-primary px-6 py-4 text-xs font-semibold uppercase tracking-[.13em] text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="button-hero-book">{content.hero.primaryAction || 'Prendre rendez-vous'} <ArrowUpRight size={15} /></a>
            <ActionLink href="/soins" secondary testId="link-hero-care">{content.hero.secondaryAction || 'Découvrir nos soins'}</ActionLink>
          </div>
          <div className="mt-12 flex items-center gap-3 border-t border-border pt-5 text-xs text-muted-foreground"><span className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-primary"><HeartHandshake size={15} /></span>Une équipe à l’écoute, à chaque étape.</div>
        </div>
        <div className="relative reveal-delay">
      <div className="absolute -right-3 -top-3 z-10 grid h-[94px] w-[94px] place-items-center rounded-full bg-[#d8aa88] text-center text-[9px] font-semibold uppercase leading-[1.5] tracking-[.1em] text-[#193f37] md:-right-6 md:-top-6"><span>Douceur<br />& précision<br /><span className="text-lg">+</span></span></div>
          <ImageFrame src={content.hero.imageUrl} alt="Présentation du cabinet dentaire Naya" label="Photo de présentation à ajouter" className="h-[360px] rounded-t-[46%] rounded-b-[46%] md:h-[515px]" />
          <div className="absolute -bottom-5 left-2 rounded-2xl border border-border/70 bg-background/95 px-5 py-4 shadow-sm md:-left-9 md:px-6"><span className="block font-display text-xl">Le temps de bien faire.</span><span className="mt-1 block text-[10px] uppercase tracking-[.16em] text-muted-foreground">Votre santé bucco-dentaire, avec attention</span></div>
        </div>
      </section>
      <section className="border-y border-border bg-[#efe9dc]">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 md:grid-cols-3 md:px-10 lg:px-14">
          {[
            { n: '01', title: 'On vous écoute', text: 'Votre histoire et vos besoins guident chaque décision.' },
            { n: '02', title: 'On vous explique', text: 'Des mots simples, un plan clair, aucune surprise.' },
            { n: '03', title: 'On prend soin', text: 'Des gestes précis, dans un environnement apaisant.' },
          ].map((item) => <div key={item.n} className="flex gap-4 md:border-r md:border-foreground/10 md:last:border-0"><span className="pt-1 font-display text-sm italic text-accent">{item.n}</span><div><h2 className="font-display text-xl">{item.title}</h2><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{item.text}</p></div></div>)}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28 lg:px-14">
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end"><div><p className="mb-4 text-[10px] font-bold uppercase tracking-[.25em] text-primary">Nos soins</p><h2 className="font-display text-4xl tracking-[-.04em] md:text-5xl">Prendre soin, avec justesse.</h2><p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">Des soins pensés pour préserver votre santé et vous aider à vous sentir bien, tout simplement.</p></div><ActionLink href="/soins" secondary testId="link-home-all-services">Tous les soins</ActionLink></div>
        {content.services.length ? <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{content.services.slice(0, 3).map((service) => <ServiceCard key={service.id} item={service} />)}</div> :
          <EmptyInline title="Nos soins seront bientôt présentés ici" text="Les informations du cabinet seront mises à jour prochainement." />}
      </section>
      <section className="bg-[#e8e1d4]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-[.9fr_1.1fr] md:items-center md:px-10 md:py-24 lg:px-14">
          <div><p className="mb-4 text-[10px] font-bold uppercase tracking-[.25em] text-primary">Le cabinet</p><h2 className="font-display text-4xl leading-tight tracking-[-.04em] md:text-5xl">Un endroit où<br /><i>vous pouvez souffler.</i></h2><p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">Nous croyons que se sentir en confiance fait partie du soin. Découvrez une équipe humaine, un espace accueillant et des explications sans jargon.</p><div className="mt-8"><ActionLink href="/equipe" testId="link-home-team">Rencontrer l’équipe</ActionLink></div></div>
          <div className="relative"><ImageFrame src={content.team[0]?.imageUrl || ''} alt="Présentation de l'équipe du cabinet" label="Photo de l’équipe à ajouter" className="h-[320px] rounded-[2rem] md:h-[430px]" /><div className="absolute -bottom-5 right-4 flex items-center gap-3 rounded-2xl bg-background px-5 py-4 shadow-sm md:right-8"><ShieldCheck className="text-primary" size={22} /><span className="text-xs leading-5">Des soins expliqués,<br /><b>jamais imposés.</b></span></div></div>
        </div>
      </section>
      {activeCampaigns.length > 0 && <section className="mx-auto max-w-7xl px-5 py-20 md:px-10 lg:px-14"><div className="mb-8 flex items-end justify-between"><div><p className="mb-3 text-[10px] font-bold uppercase tracking-[.25em] text-primary">À la une</p><h2 className="font-display text-4xl">Nos informations</h2></div><Link href="/informations" className="text-xs text-primary" data-testid="link-home-campaigns">Tout voir <ArrowRight className="ml-2 inline" size={14} /></Link></div><CampaignGrid campaigns={activeCampaigns.slice(0, 2)} /></section>}
      <section className="bg-[#183c35] text-[#f7f3e9]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:grid-cols-[1fr_auto] md:items-center md:px-10 md:py-20 lg:px-14"><div><p className="mb-4 text-[10px] uppercase tracking-[.25em] text-[#d8aa88]">On commence par une conversation</p><h2 className="max-w-2xl font-display text-4xl tracking-[-.04em] md:text-5xl">Votre prochain rendez-vous peut être plus simple que vous ne le pensez.</h2></div><a href={content.clinic.bookingUrl || `tel:${content.clinic.phone || ''}`} target={content.clinic.bookingUrl ? '_blank' : undefined} rel="noreferrer" className="inline-flex items-center justify-center gap-3 rounded-full bg-[#d8aa88] px-6 py-4 text-xs font-bold uppercase tracking-[.12em] text-[#183c35] transition-transform hover:-translate-y-1" data-testid="button-home-final-book">Parlons-en <ArrowUpRight size={15} /></a></div>
      </section>
    </main>
  </SiteShell>;
}

function EmptyInline({ title, text }: { title: string; text: string }) {
  return <div className="mt-8 rounded-3xl border border-dashed border-border bg-card/60 px-6 py-10 text-center" data-testid="empty-content"><p className="font-display text-xl">{title}</p><p className="mt-2 text-sm text-muted-foreground">{text}</p></div>;
}

function ServiceCard({ item }: { item: ServiceItem }) {
  return <article className="group overflow-hidden rounded-[24px] border border-border bg-card transition-transform hover:-translate-y-1" data-testid={`card-service-${item.id}`}>
    <ImageFrame src={item.imageUrl} alt={item.title} label="Visuel du soin à ajouter" className="h-48" />
    <div className="p-6"><h3 className="font-display text-2xl">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary || item.description}</p><span className="mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-primary">En savoir plus <ArrowRight size={14} /></span></div>
  </article>;
}

function ServicesPage({ content }: { content: SiteContent }) {
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Des soins à votre mesure" title="La santé d’abord. Le confort, toujours." text="Nous prenons soin de votre sourire avec une approche préventive, des gestes précis et des explications qui vous ressemblent." />
    <section className="mx-auto max-w-7xl px-5 pb-24 md:px-10 lg:px-14">
      {content.services.length ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{content.services.map((service) => <ServiceCard key={service.id} item={service} />)}</div> : <EmptyInline title="La carte des soins se prépare" text="Revenez bientôt pour découvrir les soins proposés par le cabinet." />}
      <div className="mt-16 rounded-[30px] bg-[#e8e1d4] p-7 md:grid md:grid-cols-[1fr_auto] md:items-center md:p-10"><div><h2 className="font-display text-3xl">Une question avant de venir ?</h2><p className="mt-2 text-sm text-muted-foreground">Nous sommes là pour vous orienter, sans engagement.</p></div><ActionLink href="/contact" testId="link-services-contact">Échanger avec nous</ActionLink></div>
    </section></main></SiteShell>;
}

function TeamPage({ content }: { content: SiteContent }) {
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Derrière chaque sourire" title="Une équipe, avant tout humaine." text="Nous sommes là pour vous accueillir tels que vous êtes et construire avec vous un parcours de soin qui a du sens." />
    <section className="mx-auto max-w-7xl px-5 pb-24 md:px-10 lg:px-14">{content.team.length ? <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">{content.team.map((member) => <article key={member.id} className="group" data-testid={`card-team-${member.id}`}><ImageFrame src={member.imageUrl} alt={`Portrait de ${member.name}`} label="Portrait à ajouter" className="h-[380px] rounded-[28px]" /><p className="mt-5 text-[10px] uppercase tracking-[.2em] text-primary">{member.role}</p><h2 className="mt-2 font-display text-3xl">{member.name}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{member.biography}</p></article>)}</div> : <EmptyInline title="Faisons connaissance bientôt" text="Les portraits et présentations de l’équipe seront publiés ici." />}
    </section></main></SiteShell>;
}

function GalleryPage({ content }: { content: SiteContent }) {
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Le cabinet en images" title="Un lieu pensé pour votre confort." text="Un aperçu de l’atmosphère qui vous attend. Les images de présentation seront ajoutées par l’équipe du cabinet." />
    <section className="mx-auto max-w-7xl px-5 pb-24 md:px-10 lg:px-14">{content.gallery.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{content.gallery.map((photo, i) => <figure key={photo.id} className={`overflow-hidden rounded-[26px] ${i % 4 === 0 ? 'sm:row-span-2' : ''}`} data-testid={`gallery-image-${photo.id}`}><ImageFrame src={photo.imageUrl} alt={photo.alt} label="Photo du cabinet à ajouter" className={i % 4 === 0 ? 'h-[400px] sm:h-full sm:min-h-[620px]' : 'h-[300px]'} /><figcaption className="sr-only">{photo.alt}</figcaption></figure>)}</div> : <EmptyInline title="L’espace se dévoilera bientôt" text="La galerie du cabinet est en préparation." />}</section></main></SiteShell>;
}

function ReviewsPage({ content }: { content: SiteContent }) {
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Vos mots comptent" title="La confiance se construit ensemble." text="Chaque retour nous aide à mieux vous accueillir. Les témoignages ci-dessous sont des exemples de présentation et doivent être remplacés avant le lancement." />
    <section className="mx-auto max-w-7xl px-5 pb-24 md:px-10 lg:px-14"><div className="mb-8 rounded-2xl border border-[#d8aa88]/50 bg-[#f0e4d9] p-5 text-sm leading-6 text-[#604d3c]" data-testid="notice-sample-testimonials"><b>Contenu de démonstration :</b> témoignages fictifs, à remplacer par des avis réels avec consentement avant publication.</div>
      {content.testimonials.length ? <div className="grid gap-5 md:grid-cols-2">{content.testimonials.map((review) => <ReviewCard key={review.id} review={review} />)}</div> : <EmptyInline title="Votre expérience compte" text="Les avis seront affichés ici lorsqu’ils seront disponibles." />}
      <div className="mt-12 text-center"><ActionLink href="/contact" testId="link-reviews-contact">Nous laisser un message</ActionLink></div>
    </section></main></SiteShell>;
}

function ReviewCard({ review }: { review: Testimonial }) {
  return <article className="relative rounded-[26px] border border-border bg-card p-7 md:p-9" data-testid={`card-review-${review.id}`}><Quote className="text-accent" size={24} /><p className="mt-5 font-display text-xl leading-8">« {review.quote} »</p><div className="mt-7 flex items-center justify-between border-t border-border pt-4"><div><p className="text-sm font-semibold">{review.name}</p><p className="mt-1 text-[10px] uppercase tracking-[.16em] text-muted-foreground">{review.service}</p></div><span className="text-xs text-primary" aria-label={`${review.rating} sur 5`}>{'★'.repeat(Math.max(0, Math.min(5, review.rating)))}</span></div></article>;
}

function FAQPage({ content }: { content: SiteContent }) {
  const [expanded, setExpanded] = useState<string | null>(content.faqs[0]?.id || null);
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Questions fréquentes" title="Les réponses, sans détour." text="Vous préparer à votre visite, c’est déjà prendre soin de vous. Voici les réponses aux questions que l’on nous pose souvent." />
    <section className="mx-auto max-w-4xl px-5 pb-24 md:px-10">{content.faqs.length ? <div className="divide-y divide-border border-y border-border">{content.faqs.map((faq) => <article key={faq.id} data-testid={`faq-item-${faq.id}`}><button type="button" aria-expanded={expanded === faq.id} onClick={() => setExpanded(expanded === faq.id ? null : faq.id)} className="flex w-full items-center justify-between gap-5 py-6 text-left" data-testid={`button-faq-${faq.id}`}><span className="font-display text-xl md:text-2xl">{faq.question}</span><ChevronDown className={`shrink-0 text-primary transition-transform ${expanded === faq.id ? 'rotate-180' : ''}`} size={20} /></button>{expanded === faq.id && <p className="max-w-3xl pb-7 text-sm leading-7 text-muted-foreground">{faq.answer}</p>}</article>)}</div> : <EmptyInline title="Une question particulière ?" text="Contactez-nous, nous serons heureux de vous répondre." />}
      <div className="mt-12 rounded-3xl bg-[#e8e1d4] p-7 md:p-9"><h2 className="font-display text-2xl">Votre question n’est pas ici ?</h2><p className="mt-2 text-sm text-muted-foreground">Notre équipe est à votre écoute.</p><div className="mt-5"><ActionLink href="/contact" testId="link-faq-contact">Nous contacter</ActionLink></div></div>
    </section></main></SiteShell>;
}

function BlogPage({ content }: { content: SiteContent }) {
  const posts = content.blogPosts.filter((post) => post.published);
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Le carnet Naya" title="Quelques repères pour votre sourire." text="Des conseils simples, des idées reçues éclaircies et des réponses pour prendre soin de votre santé bucco-dentaire au quotidien." />
    <section className="mx-auto max-w-7xl px-5 pb-24 md:px-10 lg:px-14">{posts.length ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{posts.map((post) => <BlogCard key={post.id} post={post} />)}</div> : <EmptyInline title="Le carnet prend forme" text="Nos premiers conseils et articles seront publiés prochainement." />}</section></main></SiteShell>;
}

function BlogCard({ post }: { post: BlogPost }) {
  return <article className="overflow-hidden rounded-[26px] border border-border bg-card" data-testid={`card-blog-${post.id}`}><Link href={`/blog/${post.slug}`} className="block" data-testid={`link-blog-${post.slug}`}><ImageFrame src={post.imageUrl} alt={post.title} label="Illustration de l’article à ajouter" className="h-56" /><div className="p-6"><p className="text-[10px] uppercase tracking-[.16em] text-primary">{post.date} · {post.author}</p><h2 className="mt-3 font-display text-2xl leading-tight">{post.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{post.excerpt}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-primary">Lire l’article <ArrowRight size={14} /></span></div></Link></article>;
}

function BlogArticlePage({ content, slug }: { content: SiteContent; slug?: string }) {
  const post = content.blogPosts.find((candidate) => candidate.slug === slug && candidate.published);
  if (!post) return <SiteShell clinic={content.clinic}><main className="mx-auto max-w-3xl px-5 py-24 text-center"><p className="text-[10px] uppercase tracking-[.22em] text-primary">Article introuvable</p><h1 className="mt-4 font-display text-4xl">Ce carnet n’a pas encore cette page.</h1><div className="mt-7"><ActionLink href="/blog" testId="link-article-back">Retour au carnet</ActionLink></div></main></SiteShell>;
  return <SiteShell clinic={content.clinic}><main><article className="mx-auto max-w-4xl px-5 pb-24 pt-14 md:px-10 md:pt-20"><Link href="/blog" className="inline-flex items-center gap-2 text-xs text-primary" data-testid="link-back-blog"><ArrowLeft size={14} /> Tous les articles</Link><p className="mt-10 text-[10px] uppercase tracking-[.2em] text-primary">{post.date} · {post.author}</p><h1 className="mt-4 font-display text-4xl leading-tight tracking-[-.04em] md:text-6xl">{post.title}</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">{post.excerpt}</p><ImageFrame src={post.imageUrl} alt={post.title} label="Illustration de l’article à ajouter" className="mt-10 h-[280px] rounded-[28px] md:h-[440px]" /><div className="prose prose-lg mt-10 max-w-none whitespace-pre-line font-sans leading-8 text-foreground/80">{post.content}</div></article></main></SiteShell>;
}

function CampaignGrid({ campaigns }: { campaigns: Campaign[] }) {
  return <div className="grid gap-5 md:grid-cols-2">{campaigns.map((campaign) => <article key={campaign.id} className="overflow-hidden rounded-[26px] border border-border bg-card" data-testid={`card-campaign-${campaign.id}`}><div className="relative"><ImageFrame src={campaign.imageUrl} alt={campaign.title} label={campaign.mediaType === 'video' ? 'Miniature vidéo à ajouter' : 'Visuel à ajouter'} className="h-60" />{campaign.mediaType === 'video' && campaign.videoUrl && <a href={campaign.videoUrl} target="_blank" rel="noreferrer" aria-label={`Voir la vidéo : ${campaign.title}`} className="absolute inset-0 grid place-items-center bg-foreground/10" data-testid={`link-campaign-video-${campaign.id}`}><span className="grid h-16 w-16 place-items-center rounded-full bg-background/90 text-primary"><Play fill="currentColor" size={20} /></span></a>}</div><div className="p-6"><h2 className="font-display text-2xl">{campaign.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{campaign.description}</p></div></article>)}</div>;
}

function InformationPage({ content }: { content: SiteContent }) {
  const campaigns = content.campaigns.filter((campaign) => campaign.active);
  return <SiteShell clinic={content.clinic}><main><PageIntro eyebrow="Informations du cabinet" title="Les nouvelles de la maison." text="Campagnes, actualités et informations utiles partagées par l’équipe du cabinet." /><section className="mx-auto max-w-7xl px-5 pb-24 md:px-10 lg:px-14">{campaigns.length ? <CampaignGrid campaigns={campaigns} /> : <EmptyInline title="Rien de nouveau pour le moment" text="Les informations utiles seront partagées ici dès qu’elles seront disponibles." />}</section></main></SiteShell>;
}

function ContactPage({ content }: { content: SiteContent }) {
  const clinic = content.clinic;
  return <SiteShell clinic={clinic}><main><PageIntro eyebrow="Prenons le temps d’échanger" title="Nous sommes tout près." text="Un rendez-vous, une question, un besoin d’orientation ? Contactez-nous comme vous le souhaitez." />
    <section className="mx-auto grid max-w-7xl gap-7 px-5 pb-24 md:grid-cols-[.9fr_1.1fr] md:px-10 lg:px-14">
      <div className="rounded-[30px] bg-[#183c35] p-7 text-[#f7f3e9] md:p-10"><p className="text-[10px] uppercase tracking-[.24em] text-[#d8aa88]">Cabinet Naya · Douala</p><h2 className="mt-4 font-display text-3xl">À votre écoute.</h2><div className="mt-8 space-y-6">
        <a href={`tel:${clinic.phone}`} className="flex items-start gap-4 text-sm" data-testid="link-contact-phone"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><Phone size={16} /></span><span><b className="block font-medium">Téléphone</b><span className="mt-1 block text-white/70">{clinic.phone || 'À renseigner'}</span></span></a>
        <a href={`mailto:${clinic.email}`} className="flex items-start gap-4 text-sm" data-testid="link-contact-email"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><MessageCircle size={16} /></span><span><b className="block font-medium">Courriel</b><span className="mt-1 block text-white/70">{clinic.email || 'À renseigner'}</span></span></a>
        <div className="flex items-start gap-4 text-sm" data-testid="text-contact-address"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><MapPin size={16} /></span><span><b className="block font-medium">Adresse</b><span className="mt-1 block text-white/70">{clinic.address || 'Douala, Cameroun'}</span></span></div>
        <div className="flex items-start gap-4 text-sm" data-testid="text-contact-hours"><span className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><Clock3 size={16} /></span><span><b className="block font-medium">Horaires</b><span className="mt-1 block whitespace-pre-line text-white/70">{clinic.openingHours || 'À renseigner'}</span></span></div>
      </div><a href={clinic.bookingUrl || `tel:${clinic.phone}`} target={clinic.bookingUrl ? '_blank' : undefined} rel="noreferrer" className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#d8aa88] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-[#183c35]" data-testid="button-contact-book">Demander un rendez-vous <ArrowUpRight size={15} /></a></div>
      <div className="flex min-h-[360px] flex-col overflow-hidden rounded-[30px] border border-border bg-[#e8e1d4]">
        {clinic.mapUrl ? <iframe title="Carte pour rejoindre le cabinet" src={clinic.mapUrl} loading="lazy" className="h-full min-h-[300px] w-full border-0" referrerPolicy="no-referrer-when-downgrade" data-testid="map-contact" /> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-background text-primary"><MapPin size={22} /></span><h2 className="mt-5 font-display text-2xl">Au cœur de {safeCity(clinic.city)}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{clinic.address || 'L’adresse précise du cabinet sera publiée ici.'}</p><p className="mt-4 text-[10px] uppercase tracking-[.16em] text-primary">Carte à configurer dans l’espace administrateur</p></div>}
      </div>
    </section>
  </main></SiteShell>;
}

type ArraySection = 'services' | 'team' | 'gallery' | 'testimonials' | 'faqs' | 'blogPosts' | 'campaigns';
const sections: { key: ArraySection; label: string; help: string }[] = [
  { key: 'services', label: 'Soins', help: 'Présentation des soins et images associées.' },
  { key: 'team', label: 'Équipe', help: 'Profils et photos de présentation.' },
  { key: 'gallery', label: 'Galerie', help: 'Images du cabinet et textes alternatifs.' },
  { key: 'testimonials', label: 'Avis', help: 'Témoignages à remplacer par des retours réels avant lancement.' },
  { key: 'faqs', label: 'FAQ', help: 'Questions et réponses visibles sur le site.' },
  { key: 'blogPosts', label: 'Blog', help: 'Articles publiés ou gardés en brouillon.' },
  { key: 'campaigns', label: 'Campagnes', help: 'Informations illustrées ou vidéos.' },
];

const newItem: Record<ArraySection, Record<string, unknown>> = {
  services: { id: '', title: '', slug: '', summary: '', description: '', imageUrl: '' },
  team: { id: '', name: '', role: '', biography: '', imageUrl: '' },
  gallery: { id: '', alt: '', imageUrl: '' },
  testimonials: { id: '', name: '', service: '', quote: '', rating: 5 },
  faqs: { id: '', question: '', answer: '' },
  blogPosts: { id: '', title: '', slug: '', excerpt: '', content: '', imageUrl: '', author: '', date: new Date().toISOString().slice(0, 10), published: false },
  campaigns: { id: '', title: '', description: '', mediaType: 'image', imageUrl: '', videoUrl: null, active: false },
};

const fieldLabels: Record<string, string> = {
  name: 'Nom', city: 'Ville', address: 'Adresse', phone: 'Téléphone', email: 'Courriel',
  openingHours: 'Horaires', bookingUrl: 'Lien de réservation', mapUrl: 'Lien de carte / intégration',
  logoUrl: 'URL du logo', eyebrow: 'Accroche courte', title: 'Titre', description: 'Description',
  primaryAction: 'Action principale', secondaryAction: 'Action secondaire', imageUrl: 'URL de l’image',
  id: 'Identifiant', slug: 'Adresse courte (slug)', summary: 'Résumé', biography: 'Présentation',
  alt: 'Texte alternatif', service: 'Soin concerné', quote: 'Témoignage', rating: 'Note (1–5)',
  question: 'Question', answer: 'Réponse', excerpt: 'Chapô', content: 'Texte de l’article',
  author: 'Auteur', date: 'Date', published: 'Publié', mediaType: 'Type de média',
  videoUrl: 'Lien de la vidéo', active: 'Campagne active',
};

function AdminPage() {
  const access = useGetAdminAccess({ query: { queryKey: getGetAdminAccessQueryKey(), retry: false } });
  const contentQuery = useGetSiteContent({ query: { queryKey: getGetSiteContentQueryKey(), enabled: !!access.data?.isAdmin } });
  const update = useUpdateSiteContent();
  const client = useQueryClient();
  const [draft, setDraft] = useState<SiteContent | null>(null);
  const [section, setSection] = useState<'clinic' | 'hero' | ArraySection>('clinic');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (contentQuery.data) {
      const content = contentQuery.data;
      setDraft((current) => current ?? JSON.parse(JSON.stringify(content)) as SiteContent);
    }
  }, [contentQuery.data]);
  const currentFields = section === 'clinic' ? draft?.clinic : section === 'hero' ? draft?.hero : null;
  const entries = section !== 'clinic' && section !== 'hero' && draft ? draft[section] as unknown as Record<string, unknown>[] : [];
  const busy = update.isPending;
  function setObjectField(key: string, raw: string) {
    if (!draft || !currentFields) return;
    const value = (currentFields as unknown as Record<string, unknown>)[key];
    const nextValue = typeof value === 'number' ? Number(raw) : raw;
    setDraft({ ...draft, [section]: { ...currentFields, [key]: nextValue } } as SiteContent);
    setSaved(false);
  }
  function setArrayField(index: number, key: string, raw: string) {
    if (!draft || section === 'clinic' || section === 'hero') return;
    const current = [...(draft[section] as unknown as Record<string, unknown>[])];
    const value = current[index][key];
    let nextValue: unknown = raw;
    if (typeof value === 'number') nextValue = Number(raw);
    if (typeof value === 'boolean') nextValue = raw === 'true';
    if (key === 'videoUrl' && raw.trim() === '') nextValue = null;
    current[index] = { ...current[index], [key]: nextValue };
    setDraft({ ...draft, [section]: current } as SiteContent);
    setSaved(false);
  }
  function addItem() {
    if (!draft || section === 'clinic' || section === 'hero') return;
    const base = newItem[section];
    const item = { ...base, id: `${section}-${Date.now().toString(36)}` };
    setDraft({ ...draft, [section]: [...(draft[section] as unknown as Record<string, unknown>[]), item] } as SiteContent);
    setSaved(false);
  }
  function removeItem(index: number) {
    if (!draft || section === 'clinic' || section === 'hero') return;
    if (!window.confirm('Supprimer cet élément ? Cette action sera appliquée après publication.')) return;
    const next = (draft[section] as unknown as Record<string, unknown>[]).filter((_, i) => i !== index);
    setDraft({ ...draft, [section]: next } as SiteContent);
    setSaved(false);
  }
  function publish() {
    if (!draft) return;
    update.mutate({ data: draft }, {
      onSuccess: (content) => {
        client.setQueryData(getGetSiteContentQueryKey(), content);
        client.invalidateQueries({ queryKey: getGetAdminAccessQueryKey() });
        setDraft(JSON.parse(JSON.stringify(content)) as SiteContent);
        setSaved(true);
      },
    });
  }
  if (access.isLoading) return <div className="min-h-[100dvh] bg-[#f7f4ed] p-6"><div className="mx-auto max-w-6xl"><div className="h-12 w-48 animate-pulse rounded bg-secondary" /><div className="mt-8 h-[420px] animate-pulse rounded-3xl bg-secondary/60" /></div></div>;
  if (access.isError || !access.data?.isAdmin) return <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f4ed] px-5"><div className="max-w-md rounded-[30px] border border-border bg-card p-9 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary"><ShieldCheck size={24} /></span><h1 className="mt-5 font-display text-3xl">Espace réservé</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Connectez-vous avec un compte administrateur autorisé pour modifier le site.</p><Link href="/sign-in" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-wide text-primary-foreground" data-testid="link-admin-signin">Accéder à la connexion</Link><Link href="/" className="mt-4 block text-xs text-primary" data-testid="link-admin-home">Retour au site</Link></div></div>;
  if (contentQuery.isError) return <div className="mx-auto max-w-3xl px-5 py-20"><FetchError retry={() => void contentQuery.refetch()} /></div>;
  if (contentQuery.isLoading || !draft) return <div className="min-h-[100dvh] bg-[#f7f4ed] p-6"><div className="mx-auto max-w-6xl"><div className="h-12 w-56 animate-pulse rounded bg-secondary" /><div className="mt-8 h-96 animate-pulse rounded-3xl bg-secondary/60" /></div></div>;
  return <div className="min-h-[100dvh] bg-[#f5f1e8] text-foreground">
    <header className="sticky top-0 z-20 border-b border-border bg-[#f5f1e8]/95 backdrop-blur"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4 md:px-8"><div><p className="text-[9px] font-bold uppercase tracking-[.23em] text-primary">Cabinet Naya · Édition</p><h1 className="mt-1 font-display text-xl md:text-2xl">Espace de publication</h1></div><div className="flex items-center gap-3"><Link href="/" className="hidden text-xs text-muted-foreground hover:text-primary sm:block" data-testid="link-admin-preview">Voir le site <ArrowUpRight className="ml-1 inline" size={13} /></Link><button onClick={publish} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-primary-foreground disabled:opacity-60" data-testid="button-publish-site">{busy ? 'Publication…' : saved ? <><Check size={14} /> Publié</> : 'Publier les changements'} <ArrowUpRight size={14} /></button></div></div></header>
    <div className="mx-auto grid max-w-[1500px] gap-7 px-4 py-6 md:grid-cols-[220px_1fr] md:px-8 md:py-9">
      <aside className="md:sticky md:top-[90px] md:h-fit"><div className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible">
        {[['clinic', 'Cabinet'], ['hero', 'Accueil'], ...sections.map((item) => [item.key, item.label] as const)].map(([key, label]) => <button key={key} onClick={() => setSection(key as typeof section)} className={`shrink-0 rounded-full px-4 py-3 text-left text-xs font-medium transition-colors md:w-full md:rounded-xl ${section === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`} data-testid={`button-admin-tab-${key}`}>{label}</button>)}
      </div><p className="mt-6 hidden rounded-2xl border border-border bg-card p-4 text-[11px] leading-5 text-muted-foreground md:block">Les changements sont enregistrés ensemble et deviennent visibles dès leur publication.</p></aside>
      <main className="min-w-0">
        <div className="mb-6 flex flex-col justify-between gap-2 md:flex-row md:items-end"><div><p className="text-[10px] uppercase tracking-[.2em] text-primary">{section === 'clinic' ? 'Coordonnées & identité' : section === 'hero' ? 'Première impression' : sections.find((entry) => entry.key === section)?.label}</p><h2 className="mt-2 font-display text-3xl md:text-4xl">{section === 'clinic' ? 'Informations du cabinet' : section === 'hero' ? 'Contenu de l’accueil' : sections.find((entry) => entry.key === section)?.label}</h2></div><p className="text-xs text-muted-foreground">Modifications non publiées : enregistrées dans cette session</p></div>
        {section === 'testimonials' && <div className="mb-5 rounded-2xl border border-[#d8aa88]/50 bg-[#f0e4d9] p-4 text-xs leading-5 text-[#604d3c]" data-testid="notice-admin-sample-content"><b>Avant lancement :</b> témoignages, articles et textes d’exemple doivent être remplacés et vérifiés. Les avis ne doivent être publiés qu’avec l’accord des personnes concernées.</div>}
        {(section === 'clinic' || section === 'hero') && <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(currentFields || {}).map(([key, value]) => <AdminField key={`${section}-${key}`} name={key} value={value} onChange={(raw) => setObjectField(key, raw)} wide={key === 'description' || key === 'openingHours'} />)}
        </div>}
        {section !== 'clinic' && section !== 'hero' && <div className="space-y-5">
          {entries.map((item, index) => <section key={String(item.id ?? index)} className="rounded-[22px] border border-border bg-card p-5 md:p-6" data-testid={`admin-entry-${section}-${String(item.id ?? index)}`}>
            <div className="mb-5 flex items-center justify-between border-b border-border pb-4"><div><p className="text-[9px] uppercase tracking-[.18em] text-muted-foreground">{sections.find((entry) => entry.key === section)?.label} · {String(item.id || `Élément ${index + 1}`)}</p><h3 className="mt-1 font-display text-xl">{String(item.title || item.name || item.question || `Élément ${index + 1}`)}</h3></div><button type="button" onClick={() => removeItem(index)} aria-label="Supprimer cet élément" className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive" data-testid={`button-remove-${section}-${index}`}><Trash2 size={16} /></button></div>
            <div className="grid gap-4 md:grid-cols-2">{Object.entries(item).map(([key, value]) => <AdminField key={`${String(item.id)}-${key}`} name={key} value={value} onChange={(raw) => setArrayField(index, key, raw)} wide={['description', 'biography', 'quote', 'answer', 'content', 'excerpt'].includes(key)} />)}</div>
            {typeof item.imageUrl === 'string' && item.imageUrl && <div className="mt-4"><p className="mb-2 text-[10px] uppercase tracking-[.16em] text-muted-foreground">Aperçu</p><ImageFrame src={item.imageUrl} alt="Aperçu du visuel" className="h-48 rounded-xl" /> </div>}
          </section>)}
          {!entries.length && <div className="rounded-[22px] border border-dashed border-border bg-card/60 p-10 text-center" data-testid={`empty-admin-${section}`}><ImageIcon className="mx-auto text-primary/70" size={24} /><h3 className="mt-4 font-display text-xl">Aucun élément pour le moment</h3><p className="mt-2 text-sm text-muted-foreground">Ajoutez un premier élément. Les URL d’images sont facultatives.</p></div>}
          <button onClick={addItem} className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-5 py-3 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground" data-testid={`button-add-${section}`}><Plus size={15} /> Ajouter {sections.find((entry) => entry.key === section)?.label.toLowerCase()}</button>
        </div>}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-[#eee8dc] p-4 md:px-6"><div><p className="text-xs font-semibold">Publication immédiate</p><p className="mt-1 text-[11px] text-muted-foreground">{update.isError ? 'La publication a échoué. Vérifiez votre connexion et réessayez.' : saved ? 'Le site public affiche les changements.' : 'Publiez pour rendre vos modifications visibles sur le site.'}</p></div><button onClick={publish} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-primary-foreground disabled:opacity-60" data-testid="button-publish-bottom">{busy ? 'Publication…' : 'Publier maintenant'} <ArrowUpRight size={14} /></button></div>
      </main>
    </div>
  </div>;
}

function AdminField({ name, value, onChange, wide = false }: { name: string; value: unknown; onChange: (value: string) => void; wide?: boolean }) {
  const label = fieldLabels[name] || name;
  const isBool = typeof value === 'boolean';
  const isLong = wide || ['description', 'biography', 'quote', 'answer', 'content', 'excerpt'].includes(name);
  const isSelect = name === 'mediaType';
  return <label className={`block text-xs font-medium text-foreground/80 ${wide ? 'md:col-span-2' : ''}`} data-testid={`field-${name}`}>
    <span className="mb-2 block">{label}</span>
    {isBool ? <select className="editor-input" value={String(value)} onChange={(event) => onChange(event.target.value)} data-testid={`input-${name}`}><option value="true">Oui</option><option value="false">Non</option></select>
      : isSelect ? <select className="editor-input" value={String(value ?? 'image')} onChange={(event) => onChange(event.target.value)} data-testid={`input-${name}`}><option value="image">Image</option><option value="video">Vidéo</option></select>
      : isLong ? <textarea rows={name === 'content' ? 8 : 4} className="editor-input resize-y" value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} placeholder={name.toLowerCase().includes('url') ? 'https://…' : ''} data-testid={`input-${name}`} />
      : <input className="editor-input" type={name === 'rating' ? 'number' : name === 'date' ? 'date' : name.toLowerCase().includes('url') ? 'url' : 'text'} min={name === 'rating' ? 1 : undefined} max={name === 'rating' ? 5 : undefined} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} placeholder={name.toLowerCase().includes('url') ? 'https://…' : ''} data-testid={`input-${name}`} />}
  </label>;
}

function SignInPage() {
  if (!clerkPubKey) return <AuthUnavailable />;
  return <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthFrame>;
}

function SignUpPage() {
  if (!clerkPubKey) return <AuthUnavailable />;
  return <AuthFrame><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthFrame>;
}

function AuthUnavailable() {
  return <AuthFrame><div className="w-full max-w-md rounded-[24px] border border-border bg-card p-8 text-center"><h1 className="font-display text-3xl">Connexion indisponible</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">L’authentification du cabinet doit être configurée avant de pouvoir ouvrir une session.</p><Link href="/" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-xs font-semibold uppercase tracking-wide text-primary-foreground" data-testid="link-auth-home">Retour au site</Link></div></AuthFrame>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) client.clear();
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);
  return null;
}

function AuthFrame({ children }: { children: ReactNode }) {
  return <main className="grid min-h-[100dvh] bg-background md:grid-cols-[.85fr_1fr]">
    <aside className="relative hidden overflow-hidden bg-[#183c35] p-12 text-[#f7f3e9] md:flex md:flex-col md:justify-between lg:p-16"><div className="absolute -right-24 top-24 h-96 w-96 rounded-full border border-white/10" /><div className="absolute -right-5 top-44 h-64 w-64 rounded-full border border-white/10" /><LogoWordmark inverse /><div className="relative z-10"><p className="text-[10px] uppercase tracking-[.25em] text-[#d8aa88]">Votre espace Naya</p><p className="mt-5 max-w-lg font-display text-5xl leading-tight">La confiance commence par une présence attentive.</p><p className="mt-5 max-w-sm text-sm leading-7 text-white/65">Accédez à votre espace sécurisé ou créez votre compte en quelques instants.</p></div><p className="text-[10px] tracking-wide text-white/50">Cabinet Naya · Douala, Cameroun</p></aside>
    <div className="flex flex-col items-center justify-center px-5 py-12"><div className="mb-6 md:hidden"><LogoWordmark /></div>{children}</div>
  </main>;
}

function PublicRoute({ page }: { page: (content: SiteContent) => ReactNode }) {
  const query = useGetSiteContent();
  const [location] = useLocation();
  if (query.isLoading) return <div className="min-h-[100dvh] bg-background"><Header /><LoadingPage /><Footer /></div>;
  if (query.isError || !query.data) return <div className="min-h-[100dvh] bg-background"><Header /><FetchError retry={() => void query.refetch()} /><Footer /></div>;
  const path = location.split('?')[0] || '/';
  const pathParts = path.split('/').filter(Boolean);
  const article = pathParts[0] === 'blog'
    ? query.data.blogPosts.find((post) => post.slug === pathParts[1] && post.published)
    : undefined;
  const pageNames: Record<string, string> = {
    '/': 'Accueil',
    '/soins': 'Soins dentaires',
    '/equipe': 'Notre équipe',
    '/galerie': 'Le cabinet',
    '/avis': 'Avis',
    '/faq': 'Questions fréquentes',
    '/blog': 'Conseils dentaires',
    '/informations': 'Informations',
    '/contact': 'Contact',
  };
  const pageName = article?.title || pageNames[path] || 'Cabinet dentaire';
  const description = article?.excerpt ||
    (path === '/'
      ? query.data.hero.description
      : `${pageName} au ${query.data.clinic.name}, à ${query.data.clinic.city}. Informations, conseils et contact.`);
  const title = path === '/'
    ? `${query.data.clinic.name} | Cabinet dentaire à ${query.data.clinic.city}`
    : `${pageName} | ${query.data.clinic.name}`;
  return <><DocumentMetadata title={title} description={description} />{page(query.data)}</>;
}

function DocumentMetadata({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = title;
    const tags = [
      { selector: 'meta[name="description"]', attribute: 'name', key: 'description', content: description },
      { selector: 'meta[property="og:title"]', attribute: 'property', key: 'og:title', content: title },
      { selector: 'meta[property="og:description"]', attribute: 'property', key: 'og:description', content: description },
      { selector: 'meta[property="og:url"]', attribute: 'property', key: 'og:url', content: `${window.location.origin}${window.location.pathname}` },
      { selector: 'meta[name="twitter:title"]', attribute: 'name', key: 'twitter:title', content: title },
      { selector: 'meta[name="twitter:description"]', attribute: 'name', key: 'twitter:description', content: description },
    ];
    for (const tag of tags) {
      let element = document.head.querySelector<HTMLMetaElement>(tag.selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(tag.attribute, tag.key);
        document.head.appendChild(element);
      }
      element.content = tag.content;
    }
  }, [description, title]);

  return null;
}

function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RouteErrorBoundary><Switch>
    <Route path="/" component={() => <PublicRoute page={(content) => <HomePage content={content} />} />} />
    <Route path="/soins" component={() => <PublicRoute page={(content) => <ServicesPage content={content} />} />} />
    <Route path="/equipe" component={() => <PublicRoute page={(content) => <TeamPage content={content} />} />} />
    <Route path="/galerie" component={() => <PublicRoute page={(content) => <GalleryPage content={content} />} />} />
    <Route path="/avis" component={() => <PublicRoute page={(content) => <ReviewsPage content={content} />} />} />
    <Route path="/faq" component={() => <PublicRoute page={(content) => <FAQPage content={content} />} />} />
    <Route path="/blog" component={() => <PublicRoute page={(content) => <BlogPage content={content} />} />} />
    <Route path="/blog/:slug" component={({ params }) => <PublicRoute page={(content) => <BlogArticlePage content={content} slug={params.slug} />} />} />
    <Route path="/informations" component={() => <PublicRoute page={(content) => <InformationPage content={content} />} />} />
    <Route path="/contact" component={() => <PublicRoute page={(content) => <ContactPage content={content} />} />} />
    <Route path="/admin" component={AdminPage} />
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route component={NotFound} />
  </Switch></RouteErrorBoundary>;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#315e54', colorForeground: '#263b36', colorMutedForeground: '#71807a',
    colorDanger: '#b3473d', colorBackground: '#fbf9f4', colorInput: '#f7f4ed',
    colorInputForeground: '#263b36', colorNeutral: '#d9d4c8',
    fontFamily: "'DM Sans', sans-serif", borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fbf9f4] rounded-[24px] w-[440px] max-w-full overflow-hidden border border-[#ddd8cb] shadow-none',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#263b36] font-semibold tracking-tight',
    headerSubtitle: 'text-[#71807a]',
    socialButtonsBlockButtonText: 'text-[#263b36] font-medium',
    formFieldLabel: 'text-[#263b36] font-medium',
    footerActionLink: 'text-[#315e54] font-semibold',
    footerActionText: 'text-[#71807a]',
    dividerText: 'text-[#71807a]',
    identityPreviewEditButton: 'text-[#315e54]',
    formFieldSuccessText: 'text-[#315e54]',
    alertText: 'text-[#943d35]',
    logoBox: 'rounded-full overflow-hidden',
    logoImage: 'rounded-full',
    socialButtonsBlockButton: 'border-[#d9d4c8] bg-[#f7f4ed] hover:bg-[#efe9dc]',
    formButtonPrimary: 'bg-[#315e54] hover:bg-[#244940] text-[#fbf9f4] shadow-none',
    formFieldInput: 'bg-[#f7f4ed] border-[#d9d4c8] text-[#263b36]',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-[#d9d4c8]',
    alert: 'bg-[#f8e9e5] border-[#e7c8c1]',
    otpCodeFieldInput: 'bg-[#f7f4ed] border-[#d9d4c8]',
    formFieldRow: 'gap-2',
    main: 'gap-4',
  },
};

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  if (!clerkPubKey) return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>;
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Ravi de vous retrouver', subtitle: 'Connectez-vous à votre espace sécurisé', actionText: 'Vous n’avez pas encore de compte ?', actionLink: 'Créer un compte' } },
        signUp: { start: { title: 'Bienvenue chez Naya', subtitle: 'Créez votre espace en quelques instants', actionText: 'Vous avez déjà un compte ?', actionLink: 'Se connecter' } },
        formFieldLabel__emailAddress: 'Adresse e-mail',
        formFieldLabel__password: 'Mot de passe',
        formButtonPrimary: 'Continuer',
        socialButtonsBlockButton: 'Continuer avec {{provider}}',
      }}
      routerPush={(to: string) => setLocation(stripBase(to))}
      routerReplace={(to: string) => setLocation(stripBase(to), { replace: true })}>
      <QueryClientProvider client={queryClient}><TooltipProvider><ClerkQueryClientCacheInvalidator /><Router /><Toaster /></TooltipProvider></QueryClientProvider>
    </ClerkProvider>;
}

function App() {
  return <WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter>;
}

export default App;
