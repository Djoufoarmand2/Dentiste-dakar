import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SiteContent } from '@workspace/api-client-react';
import { AuthProvider, useCabinetSession } from '@/components/auth-provider';
import { usePublicContent } from '@/lib/cms';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { localizedPath, rememberedSiteLocale, SiteLocaleProvider, type SiteLocale } from '@/lib/site-locale';
import { englishBlogPost, englishService } from '@/lib/cms-translations';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

const LazyAdminPage = lazy(() => import('@/pages/admin-page'));
const LazyAuthPage = lazy(() => import('@/components/supabase-auth').then((module) => ({ default: module.AuthPage })));
const LazyHomePage = lazy(() => import('@/components/public-site').then((module) => ({ default: module.HomePage })));
const LazyServicesPage = lazy(() => import('@/components/public-site').then((module) => ({ default: module.ServicesPage })));
const LazyTeamPage = lazy(() => import('@/components/public-site').then((module) => ({ default: module.TeamPage })));
const LazyGalleryPage = lazy(() => import('@/components/public-site').then((module) => ({ default: module.GalleryPage })));
const LazyReviewsPage = lazy(() => import('@/components/public-site').then((module) => ({ default: module.ReviewsPage })));
const LazyFAQPage = lazy(() => import('@/components/public-site').then((module) => ({ default: module.FAQPage })));
const LazyBlogPage = lazy(() => import('@/components/public-site').then((module) => ({ default: module.BlogPage })));
const LazyBlogArticlePage = lazy(() => import('@/components/public-site').then((module) => ({ default: module.BlogArticlePage })));
const LazyWhyChoosePage = lazy(() => import('@/components/public-site').then((module) => ({ default: module.WhyChoosePage })));
const LazyServiceDetailPage = lazy(() => import('@/components/public-site').then((module) => ({ default: module.ServiceDetailPage })));
const LazyInformationPage = lazy(() => import('@/components/public-site').then((module) => ({ default: module.InformationPage })));
const LazyContactPage = lazy(() => import('@/components/public-site').then((module) => ({ default: module.ContactPage })));
const LazyPrivacyPage = lazy(() => import('@/pages/privacy-policy').then((module) => ({ default: module.PrivacyPage })));
const LazyNotFound = lazy(() => import('@/pages/not-found'));

function getCanonicalBaseUrl() {
  const configured = import.meta.env.VITE_SITE_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    const developmentOrLocal = url.hostname === 'localhost'
      || url.hostname === '127.0.0.1'
      || url.hostname.endsWith('.replit.dev');
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || developmentOrLocal) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function isHttpsUrl(value?: string) {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

const canonicalBaseUrl = getCanonicalBaseUrl();

function indexableSeoConfigured(content: SiteContent) {
  const sharingImage = import.meta.env.VITE_SITE_OG_IMAGE_URL?.trim() || content.hero.imageUrl?.trim();
  return import.meta.env.VITE_SITE_INDEXABLE === 'true'
    && !!canonicalBaseUrl
    && !!content.clinic.name?.trim()
    && !!content.clinic.address?.trim()
    && !!content.clinic.phone?.trim()
    && !!content.clinic.email?.trim()
    && !/\.example$/i.test(content.clinic.email)
    && content.clinic.phone.replace(/\D/g, '') !== '237670000000'
    && content.clinic.address.trim().toLowerCase() !== 'bonanjo, douala, cameroun'
    && content.clinic.openingHours?.trim() !== 'Lundi au vendredi · 8h–17h'
    && !!content.hero.description?.trim()
    && !/démonstration|fictif|fictive|exemple de contenu|à remplacer|à valider|à renseigner|à confirmer/i.test(`${content.clinic.name} ${content.clinic.address} ${content.clinic.phone} ${content.clinic.email} ${content.hero.title} ${content.hero.description}`)
    && isHttpsUrl(sharingImage);
}

function metaText(value: string, maximumLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maximumLength) return normalized;
  const shortened = normalized.slice(0, maximumLength - 1).replace(/\s+\S*$/, '').trimEnd();
  return `${shortened || normalized.slice(0, maximumLength - 1).trimEnd()}…`;
}

function seoTitle(pageName: string, clinicName: string) {
  const suffix = ` | ${clinicName}`;
  const maximumPrefix = Math.max(12, 60 - suffix.length);
  if (pageName.length <= maximumPrefix) return `${pageName}${suffix}`;
  const shortened = pageName.slice(0, maximumPrefix - 1).replace(/\s+\S*$/, '').trimEnd();
  return `${shortened || pageName.slice(0, maximumPrefix - 1).trimEnd()}…${suffix}`;
}

function PublicRoute({ page, locale = 'fr' }: { page: (content: SiteContent) => ReactNode; locale?: SiteLocale }) {
  const query = usePublicContent();
  const [location] = useLocation();
  if (query.isLoading) return <main className="grid min-h-[100dvh] place-items-center bg-background px-5" role="status" aria-live="polite"><p className="animate-pulse text-sm text-muted-foreground">{locale === 'en' ? 'Loading the website…' : 'Chargement du site…'}</p></main>;
  if (query.isError || !query.data) return <main className="grid min-h-[100dvh] place-items-center bg-background px-5"><section className="max-w-xl rounded-2xl border border-border bg-card p-8 text-center" role="alert"><h1 className="font-display text-2xl text-[#073e53]">{locale === 'en' ? 'The website could not load its information' : 'Le site n’a pas pu charger ses informations'}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{locale === 'en' ? 'Please try again shortly.' : 'Réessayez dans quelques instants.'}</p><button onClick={() => void query.refetch()} className="btn-gold mt-6">{locale === 'en' ? 'Try again' : 'Réessayer'}</button></section></main>;

  const rawPath = location.split('?')[0] || '/';
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;
  const localizedRoute = locale === 'en' ? path.replace(/^\/en(?=\/|$)/, '') || '/' : path;
  const pathParts = localizedRoute.split('/').filter(Boolean);
  const article = pathParts[0] === 'blog'
    ? query.data.blogPosts.find((post) => (post.slug === pathParts[1] || post.slugEn === pathParts[1] || englishBlogPost(post).slug === pathParts[1]) && post.published)
    : undefined;
  const service = pathParts[0] === 'soins' || pathParts[0] === 'services'
    ? query.data.services.find((item) => item.slug === pathParts[1] || item.slugEn === pathParts[1] || englishService(item).slug === pathParts[1])
    : undefined;
  const pageNames: Record<SiteLocale, Record<string, string>> = {
    fr: {
    '/': 'Accueil',
    '/soins': 'Soins dentaires',
    '/pourquoi-nous-choisir': 'Pourquoi choisir notre cabinet',
    '/equipe': 'Équipe du cabinet dentaire',
    '/galerie': 'Photos du cabinet dentaire',
    '/avis': 'Avis sur le cabinet dentaire',
    '/faq': 'Questions fréquentes',
    '/blog': 'Conseils dentaires',
    '/informations': 'Informations pratiques',
    '/contact': 'Contact et rendez-vous',
    '/confidentialite': 'Confidentialité',
    },
    en: {
      '/': 'Home',
      '/services': 'Dental services',
      '/why-choose-us': 'Why choose our practice',
      '/team': 'Our dental team',
      '/gallery': 'Practice photos',
      '/reviews': 'Patient reviews',
      '/faq': 'Frequently asked questions',
      '/blog': 'Dental health articles',
      '/information': 'Practice information',
      '/contact': 'Contact and appointments',
      '/privacy': 'Privacy policy',
    },
  };
  const isWhyChooseRoute = localizedRoute === '/pourquoi-nous-choisir' || localizedRoute === '/why-choose-us';
  const isPrivacyRoute = localizedRoute === '/confidentialite' || localizedRoute === '/privacy';
  const cmsPageTitle = isWhyChooseRoute
    ? (locale === 'en' ? query.data.whyChoose?.titleEn?.trim() : query.data.whyChoose?.title?.trim())
    : isPrivacyRoute
      ? (locale === 'en' ? query.data.privacyPolicy?.titleEn?.trim() : query.data.privacyPolicy?.title?.trim())
      : '';
  const pageName = (locale === 'en' ? (article ? englishBlogPost(article).title : service ? englishService(service).title : '') : article?.title || service?.title)
    || cmsPageTitle
    || pageNames[locale][localizedRoute]
    || (locale === 'en' ? 'Cabinet Sourire Serein' : 'Cabinet Sourire Serein');
  const clinicName = query.data.clinic.name;
  const city = query.data.clinic.city;
  const routeDescriptions: Record<SiteLocale, Record<string, string>> = {
    fr: {
    '/soins': `Découvrez les soins dentaires présentés par ${clinicName} à ${city}. Contactez le cabinet pour organiser une consultation.`,
    '/pourquoi-nous-choisir': `Découvrez la façon dont ${clinicName}, cabinet dentaire à ${city}, vous accompagne et répond à vos questions.`,
    '/equipe': `Découvrez l’équipe et les informations présentées par ${clinicName}, cabinet dentaire à ${city}.`,
    '/galerie': `Découvrez en images les espaces et la vie du cabinet dentaire ${clinicName} à ${city}.`,
    '/avis': `Lisez les avis publiés sur ${clinicName}, cabinet dentaire à ${city}, et partagez votre expérience.`,
    '/faq': `Réponses aux questions fréquentes sur les soins dentaires, les rendez-vous et la première visite à ${city}.`,
    '/blog': `Articles et informations générales sur l’hygiène bucco-dentaire et les soins dentaires à ${city}.`,
    '/informations': `Retrouvez les coordonnées et les informations pratiques communiquées pour ${clinicName} à ${city}.`,
    '/contact': `Contactez ${clinicName}, cabinet dentaire à ${city}, pour demander des renseignements ou un rendez-vous.`,
    '/confidentialite': 'Informations sur la collecte, l’utilisation et la protection de vos données personnelles sur le site.',
    },
    en: {
      '/services': `Explore dental services presented by ${clinicName} in ${city}. Contact the practice to request a consultation.`,
      '/why-choose-us': `Learn how ${clinicName}, a dental practice in ${city}, approaches patient care and communication.`,
      '/team': `Meet the team and learn about ${clinicName}, a dental practice in ${city}.`,
      '/gallery': `View photos and visual information about ${clinicName} in ${city}.`,
      '/reviews': `Read visitor reviews shared about ${clinicName}, a dental practice in ${city}.`,
      '/faq': `Answers to common questions about dental care, appointments and first visits in ${city}.`,
      '/blog': `General information about oral health and dental care in ${city}.`,
      '/information': `Find practical information shared by ${clinicName} in ${city}.`,
      '/contact': `Contact ${clinicName}, a dental practice in ${city}, to ask a question or request an appointment.`,
      '/privacy': `Information about how this website collects, uses and protects personal data.`,
    },
  };
  const cmsPageDescription = isWhyChooseRoute
    ? (locale === 'en' ? query.data.whyChoose?.introEn?.trim() : query.data.whyChoose?.intro?.trim())
    : isPrivacyRoute
      ? (locale === 'en' ? query.data.privacyPolicy?.descriptionEn?.trim() : query.data.privacyPolicy?.description?.trim())
      : '';
  const contentDescription = locale === 'en'
    ? (article ? englishBlogPost(article).excerpt : service ? englishService(service).summary : cmsPageDescription)
    : article?.excerpt || service?.summary || cmsPageDescription;
  const description = metaText(contentDescription || (localizedRoute === '/'
    ? (locale === 'en' ? query.data.hero.descriptionEn?.trim() || query.data.hero.description : query.data.hero.description)
    : routeDescriptions[locale][localizedRoute] || (locale === 'en'
      ? `${pageName} at ${clinicName} in ${city}. Contact the practice for information.`
      : `${pageName} au ${clinicName}, à ${city}. Informations et contact.`)), 160);
  const title = seoTitle(localizedRoute === '/' ? (locale === 'en' ? `Dentist in ${city}` : `Cabinet dentaire à ${city}`) : pageName, query.data.clinic.name);
  const imageUrl = article?.imageUrl?.trim() || service?.imageUrl?.trim() || query.data.hero.imageUrl?.trim() || query.data.clinic.logoUrl?.trim() || undefined;
  const indexable = indexableSeoConfigured(query.data);
  return <SiteLocaleProvider locale={locale}><DocumentMetadata title={title} description={description} imageUrl={imageUrl} imageAlt={article ? (locale === 'en' ? englishBlogPost(article).imageAlt : article.imageAlt?.trim() || `Illustration de l’article : ${pageName}`) : service ? (locale === 'en' ? englishService(service).imageAlt : service.imageAlt?.trim() || `Illustration du soin : ${pageName}`) : query.data.hero.title} isArticle={!!article} indexable={indexable} locale={locale} currentPath={path} content={query.data} />{page(query.data)}</SiteLocaleProvider>;
}

function DocumentMetadata({ title, description, imageUrl, imageAlt, isArticle = false, indexable = false, locale, currentPath, content }: { title: string; description: string; imageUrl?: string; imageAlt?: string; isArticle?: boolean; indexable?: boolean; locale: SiteLocale; currentPath: string; content: SiteContent }) {
  useEffect(() => {
    document.title = title;
    document.documentElement.lang = 'fr';
    const setMeta = (selector: string, attribute: string, key: string, content?: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!content) {
        element?.remove();
        return;
      }
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.content = content;
    };

    let pathname = currentPath;
    if (basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))) pathname = pathname.slice(basePath.length) || '/';
    pathname = pathname.replace(/\/+$/, '') || '/';
    if (pathname === '/en' || /^\/(?:en\/)?(?:blog|soins|services)(?:\/.*)?$/.test(pathname)) pathname = `${pathname}/`;
    const canonicalUrl = canonicalBaseUrl ? new URL(pathname, `${canonicalBaseUrl}/`).href : undefined;
    let socialImage: string | undefined;
    for (const candidate of [imageUrl, import.meta.env.VITE_SITE_OG_IMAGE_URL]) {
      if (!candidate) continue;
      try {
        const url = new URL(candidate);
        if (url.protocol === 'https:') {
          socialImage = url.href;
          break;
        }
      } catch {
        // Relative or invalid media URLs are not emitted as social images.
      }
    }

    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta('meta[property="og:image"]', 'property', 'og:image', socialImage);
    setMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', socialImage ? imageAlt : undefined);
    setMeta('meta[property="og:type"]', 'property', 'og:type', isArticle ? 'article' : 'website');
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', title.split(' | ').at(-1));
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', locale === 'en' ? 'en_CM' : 'fr_CM');
    setMeta('meta[property="og:locale:alternate"]', 'property', 'og:locale:alternate', locale === 'en' ? 'fr_CM' : 'en_CM');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', socialImage);
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', socialImage ? 'summary_large_image' : 'summary');
    setMeta('meta[name="robots"]', 'name', 'robots', indexable ? 'index, follow' : 'noindex, nofollow');

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalUrl || !indexable) {
      canonical?.remove();
    } else {
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = canonicalUrl;
    }
    const setAlternate = (language: string, href?: string) => {
      const selector = `link[rel="alternate"][hreflang="${language}"]`;
      let link = document.head.querySelector<HTMLLinkElement>(selector);
      if (!href || !indexable) {
        link?.remove();
        return;
      }
      if (!link) {
        link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = language;
        document.head.appendChild(link);
      }
      link.href = new URL(href, `${canonicalBaseUrl}/`).href;
    };
    const frenchPath = localizedPath(currentPath, 'fr', content);
    const englishPath = localizedPath(currentPath, 'en', content);
    setAlternate('fr-CM', frenchPath);
    setAlternate('en-CM', englishPath);
    setAlternate('x-default', frenchPath);
    document.documentElement.lang = locale;
  }, [content, currentPath, description, imageAlt, imageUrl, indexable, isArticle, locale, title]);

  return null;
}

function PrivatePageMetadata({ title }: { title: string }) {
  useEffect(() => {
    document.title = title;
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex, nofollow';
    document.head.querySelector('link[rel="canonical"]')?.remove();
    document.head.querySelector('meta[property="og:url"]')?.remove();
    document.head.querySelector('meta[property="og:image"]')?.remove();
    document.head.querySelector('meta[name="twitter:image"]')?.remove();
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((link) => link.remove());
  }, [title]);
  return null;
}

function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function AdminRoute() {
  const { session } = useCabinetSession();
  return <LazyAdminPage key={session?.user.id ?? 'anonymous'} />;
}

function Router() {
  const [location, setLocation] = useLocation();
  const checkedSavedLocale = useRef(false);
  useEffect(() => {
    if (checkedSavedLocale.current) return;
    checkedSavedLocale.current = true;
    if (location === '/' && rememberedSiteLocale() === 'en') setLocation('/en');
  }, [location, setLocation]);
  const fr = (page: (content: SiteContent) => ReactNode) => <PublicRoute locale="fr" page={page} />;
  const en = (page: (content: SiteContent) => ReactNode) => <PublicRoute locale="en" page={page} />;
  return <RouteErrorBoundary><Switch>
    <Route path="/" component={() => fr((content) => <LazyHomePage content={content} />)} />
    <Route path="/soins" component={() => fr((content) => <LazyServicesPage content={content} />)} />
    <Route path="/soins/:slug" component={({ params }) => fr((content) => <LazyServiceDetailPage content={content} slug={params.slug} />)} />
    <Route path="/pourquoi-nous-choisir" component={() => fr((content) => <LazyWhyChoosePage content={content} />)} />
    <Route path="/equipe" component={() => fr((content) => <LazyTeamPage content={content} />)} />
    <Route path="/galerie" component={() => fr((content) => <LazyGalleryPage content={content} />)} />
    <Route path="/avis" component={() => fr((content) => <LazyReviewsPage content={content} />)} />
    <Route path="/faq" component={() => fr((content) => <LazyFAQPage content={content} />)} />
    <Route path="/blog" component={() => fr((content) => <LazyBlogPage content={content} />)} />
    <Route path="/blog/:slug" component={({ params }) => fr((content) => <LazyBlogArticlePage content={content} slug={params.slug} />)} />
    <Route path="/informations" component={() => fr((content) => <LazyInformationPage content={content} />)} />
    <Route path="/contact" component={() => fr((content) => <LazyContactPage content={content} />)} />
    <Route path="/confidentialite" component={() => fr((content) => <LazyPrivacyPage content={content} />)} />
    <Route path="/en" component={() => en((content) => <LazyHomePage content={content} />)} />
    <Route path="/en/" component={() => en((content) => <LazyHomePage content={content} />)} />
    <Route path="/en/services" component={() => en((content) => <LazyServicesPage content={content} />)} />
    <Route path="/en/services/:slug" component={({ params }) => en((content) => <LazyServiceDetailPage content={content} slug={params.slug} />)} />
    <Route path="/en/why-choose-us" component={() => en((content) => <LazyWhyChoosePage content={content} />)} />
    <Route path="/en/team" component={() => en((content) => <LazyTeamPage content={content} />)} />
    <Route path="/en/gallery" component={() => en((content) => <LazyGalleryPage content={content} />)} />
    <Route path="/en/reviews" component={() => en((content) => <LazyReviewsPage content={content} />)} />
    <Route path="/en/faq" component={() => en((content) => <LazyFAQPage content={content} />)} />
    <Route path="/en/blog" component={() => en((content) => <LazyBlogPage content={content} />)} />
    <Route path="/en/blog/:slug" component={({ params }) => en((content) => <LazyBlogArticlePage content={content} slug={params.slug} />)} />
    <Route path="/en/information" component={() => en((content) => <LazyInformationPage content={content} />)} />
    <Route path="/en/contact" component={() => en((content) => <LazyContactPage content={content} />)} />
    <Route path="/en/privacy" component={() => en((content) => <LazyPrivacyPage content={content} />)} />
    <Route path="/arm" component={() => <><PrivatePageMetadata title="Administration | Cabinet dentaire" /><AdminRoute /></>} />
    <Route path="/sign-in/*?" component={() => <><PrivatePageMetadata title="Connexion | Cabinet dentaire" /><LazyAuthPage mode="signin" /></>} />
    <Route path="/sign-up/*?" component={() => <><PrivatePageMetadata title="Créer un compte | Cabinet dentaire" /><LazyAuthPage mode="signup" /></>} />
    <Route path="/forgot-password" component={() => <><PrivatePageMetadata title="Récupération du compte | Cabinet dentaire" /><LazyAuthPage mode="recover" /></>} />
    <Route path="/auth/callback" component={() => <><PrivatePageMetadata title="Nouveau mot de passe | Cabinet dentaire" /><LazyAuthPage mode="reset" /></>} />
    <Route component={LazyNotFound} />
  </Switch></RouteErrorBoundary>;
}

function App() {
  return <WouterRouter base={basePath}><QueryClientProvider client={queryClient}><AuthProvider><TooltipProvider><Suspense fallback={<div className="grid min-h-[100dvh] place-items-center bg-background px-5" role="status" aria-live="polite"><p className="text-sm text-muted-foreground">Chargement…</p></div>}><Router /></Suspense><Toaster /></TooltipProvider></AuthProvider></QueryClientProvider></WouterRouter>;
}

export default App;
