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
import { withEditorialBlogPosts } from '@/lib/editorial-blog';
import { getYouTubeThumbnailUrl } from '@/lib/video-url';
import { applyClinicPhoneToContent } from '@/lib/clinic-phone';

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

function extendMetaDescription(value: string, suffix: string, maximumLength = 160) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length >= 140) return metaText(normalized, maximumLength);
  const cleanSuffix = suffix.replace(/\s+/g, ' ').trim();
  const primaryBudget = Math.max(24, maximumLength - cleanSuffix.length - 2);
  const primary = metaText(normalized, primaryBudget);
  const separator = /[.!?…]$/.test(primary) ? ' ' : '. ';
  return metaText(`${primary}${separator}${cleanSuffix}`, maximumLength);
}

function seoTitle(pageName: string, clinicName: string, city: string, locale: SiteLocale) {
  const suffix = ` | ${clinicName}`;
  const maximumPrefix = Math.max(12, 60 - suffix.length);
  const firstClause = pageName.split(/\s*[:|·—–]\s*/)[0].trim();
  const shortenedQuestion = locale === 'en'
    ? firstClause.split(/\s+(?:with|at)\s+/i)[0]
      .replace(/\s+and composite\b.*$/i, '')
      .replace(/^How much does (?:a|an|the)\s+/i, '')
    : firstClause
      .replace(/^Comment se passe (?:un|une|le|la)\s+/i, '')
      .replace(/^Comment reconnaître (?:un|une|le|la)\s+/i, '')
      .replace(/^Combien coûte (?:un|une|le|la)\s+/i, 'Coût du ');
  const lead = shortenedQuestion.replace(/[?!.,]+$/, '').trim();
  const normalizedLead = lead ? `${lead.charAt(0).toLocaleUpperCase()}${lead.slice(1)}` : firstClause;
  const localizedLead = lead.toLocaleLowerCase().includes(city.toLocaleLowerCase())
    ? normalizedLead
    : `${normalizedLead} ${locale === 'en' ? 'in' : 'à'} ${city}`;
  const hasCompactBreak = /[:|·—–]/.test(pageName) || normalizedLead !== firstClause || pageName.length > maximumPrefix;
  const preferredName = hasCompactBreak && normalizedLead.length >= 8
    ? localizedLead.length <= maximumPrefix
      ? localizedLead
      : normalizedLead.length <= maximumPrefix
        ? normalizedLead
        : pageName
    : pageName;
  if (preferredName.length <= maximumPrefix) return `${preferredName}${suffix}`;
  const shortened = preferredName.slice(0, maximumPrefix - 1).replace(/\s+\S*$/, '').trimEnd();
  return `${shortened || preferredName.slice(0, maximumPrefix - 1).trimEnd()}…${suffix}`;
}

function PublicRoute({ page, locale = 'fr' }: { page: (content: SiteContent) => ReactNode; locale?: SiteLocale }) {
  const query = usePublicContent();
  const [location] = useLocation();
  if (query.isLoading) return <main className="grid min-h-[100dvh] place-items-center bg-background px-5" role="status" aria-live="polite"><p className="animate-pulse text-sm text-muted-foreground">{locale === 'en' ? 'Loading the website…' : 'Chargement du site…'}</p></main>;
  if (query.isError || !query.data) return <main className="grid min-h-[100dvh] place-items-center bg-background px-5"><section className="max-w-xl rounded-2xl border border-border bg-card p-8 text-center" role="alert"><h1 className="font-display text-2xl text-[#073e53]">{locale === 'en' ? 'The website could not load its information' : 'Le site n’a pas pu charger ses informations'}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{locale === 'en' ? 'Please try again shortly.' : 'Réessayez dans quelques instants.'}</p><button onClick={() => void query.refetch()} className="btn-gold mt-6">{locale === 'en' ? 'Try again' : 'Réessayer'}</button></section></main>;

  const editorialContent = withEditorialBlogPosts(query.data);
  const content = applyClinicPhoneToContent(editorialContent, editorialContent.clinic.phone);
  const rawPath = location.split('?')[0] || '/';
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;
  const localizedRoute = locale === 'en' ? path.replace(/^\/en(?=\/|$)/, '') || '/' : path;
  const pathParts = localizedRoute.split('/').filter(Boolean);
  const article = pathParts[0] === 'blog'
    ? content.blogPosts.find((post) => (post.slug === pathParts[1] || post.slugEn === pathParts[1] || englishBlogPost(post).slug === pathParts[1]) && post.published)
    : undefined;
  const service = pathParts[0] === 'soins' || pathParts[0] === 'services'
    ? content.services.find((item) => item.slug === pathParts[1] || item.slugEn === pathParts[1] || englishService(item).slug === pathParts[1])
    : undefined;
  const pageNames: Record<SiteLocale, Record<string, string>> = {
    fr: {
    '/': 'Accueil',
    '/soins': 'Soins dentaires',
    '/pourquoi-nous-choisir': 'Pourquoi choisir notre cabinet',
    '/equipe': 'Équipe du cabinet dentaire',
    '/galerie': 'Photos du cabinet dentaire',
    '/avis': 'Avis patients',
    '/faq': 'FAQ dentaire',
    '/blog': 'Conseils dentaires',
    '/informations': 'Actualités et vidéos',
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
      '/faq': 'Dental care FAQs',
      '/blog': 'Dental health articles',
      '/information': 'Practice videos and news',
      '/contact': 'Contact and appointments',
      '/privacy': 'Privacy policy',
    },
  };
  const isWhyChooseRoute = localizedRoute === '/pourquoi-nous-choisir' || localizedRoute === '/why-choose-us';
  const isPrivacyRoute = localizedRoute === '/confidentialite' || localizedRoute === '/privacy';
  const isInformationRoute = localizedRoute === '/informations' || localizedRoute === '/information';
  const cmsPageTitle = isWhyChooseRoute
    ? (locale === 'en' ? content.whyChoose?.titleEn?.trim() : content.whyChoose?.title?.trim())
    : isPrivacyRoute
      ? (locale === 'en' ? content.privacyPolicy?.titleEn?.trim() : content.privacyPolicy?.title?.trim())
      : isInformationRoute
        ? (locale === 'en' ? 'Practice videos and news' : `Actualités et vidéos à ${content.clinic.city}`)
      : '';
  const pageName = (locale === 'en' ? (article ? englishBlogPost(article).title : service ? englishService(service).title : '') : article?.title || service?.title)
    || cmsPageTitle
    || pageNames[locale][localizedRoute]
    || (locale === 'en' ? 'Cabinet Sourire Serein' : 'Cabinet Sourire Serein');
  const clinicName = content.clinic.name;
  const city = content.clinic.city;
  const activeCampaigns = content.campaigns.filter((campaign) => campaign.active);
  const informationDescription = locale === 'en'
    ? `Find practice news, practical information and videos from ${clinicName} in ${city}. Prepare for your visit and explore oral health topics.`
    : `Vidéos, actualités et informations pratiques de ${clinicName} à ${city} pour préparer votre visite et découvrir des sujets de santé bucco-dentaire.`;
  const routeDescriptions: Record<SiteLocale, Record<string, string>> = {
    fr: {
    '/': `Cabinet dentaire à ${city} : ${clinicName} vous accueille à la Clinique La Bienveillance pour vos consultations, soins et conseils bucco-dentaires.`,
    '/soins': `Découvrez les soins dentaires présentés par ${clinicName} à ${city}. Informez-vous sur les étapes générales et préparez votre consultation à la Clinique La Bienveillance.`,
    '/pourquoi-nous-choisir': `Découvrez ${clinicName} à ${city} : soins dentaires, informations utiles pour les patients et accompagnement au sein de la Clinique La Bienveillance.`,
    '/equipe': `Découvrez l’équipe de ${clinicName} à ${city}, ses rôles et les informations utiles pour préparer votre visite à la Clinique La Bienveillance.`,
    '/galerie': `Découvrez en images les espaces de ${clinicName} à ${city} et les informations pratiques pour préparer votre visite à la Clinique La Bienveillance.`,
    '/avis': `Consultez les avis publiés sur ${clinicName} à ${city} et partagez votre expérience. Retrouvez les informations pour contacter le cabinet.`,
    '/faq': `Réponses aux questions sur les rendez-vous, la première visite, les soins dentaires et l’hygiène bucco-dentaire chez ${clinicName} à ${city}.`,
    '/blog': `Articles et conseils sur la santé bucco-dentaire, les douleurs et les soins dentaires proposés par ${clinicName}, cabinet dentaire à ${city}.`,
    '/informations': informationDescription,
    '/contact': `Contactez ${clinicName} à ${city} pour une question ou un rendez-vous. Retrouvez l’adresse, les horaires et les moyens de joindre le cabinet.`,
    '/confidentialite': `Informations sur la collecte, l’utilisation et la protection de vos données personnelles sur le site de ${clinicName} à ${city}. Découvrez vos droits.`,
    },
    en: {
      '/': `Dental care in ${city}: ${clinicName} welcomes you at Clinique La Bienveillance for consultations, dental services and oral health guidance.`,
      '/services': `Explore dental services offered by ${clinicName} in ${city}. Learn about general care steps and prepare for a visit at Clinique La Bienveillance.`,
      '/why-choose-us': `Learn about ${clinicName} in ${city}, its dental services, patient information and care at Clinique La Bienveillance. Find practical details for your visit.`,
      '/team': `Meet the team at ${clinicName} in ${city}, learn about their roles and find practical information to prepare for your visit at Clinique La Bienveillance.`,
      '/gallery': `View photos of ${clinicName} in ${city} and learn about the practice. Find practical information to prepare for your visit at Clinique La Bienveillance.`,
      '/reviews': `Read reviews shared about ${clinicName} in ${city} and share your experience. Find practical information and ways to contact the practice.`,
      '/faq': `Answers about appointments, first visits, dental care and oral hygiene at ${clinicName} in ${city}. Find useful details before contacting the practice.`,
      '/blog': `Articles and advice about oral health, tooth pain and dental care in ${city}. Read general information from ${clinicName} and prepare for a visit.`,
      '/information': informationDescription,
      '/contact': `Contact ${clinicName} in ${city} with a question or appointment request. Find the address, opening hours and ways to reach the practice.`,
      '/privacy': `Learn what personal data the ${clinicName} website in ${city} collects, how it is used and protected, and what choices you have as a website user.`,
    },
  };
  const cmsPageDescription = isWhyChooseRoute
    ? (locale === 'en' ? content.whyChoose?.introEn?.trim() : content.whyChoose?.intro?.trim())
    : isPrivacyRoute
      ? (locale === 'en' ? content.privacyPolicy?.descriptionEn?.trim() : content.privacyPolicy?.description?.trim())
      : isInformationRoute
        ? informationDescription
      : '';
  const contentDescription = locale === 'en'
    ? (article ? englishBlogPost(article).excerpt : service ? englishService(service).summary : cmsPageDescription)
    : article?.excerpt || service?.summary || cmsPageDescription;
  const routeDescription = routeDescriptions[locale][localizedRoute]
    || (locale === 'en'
      ? `${pageName} at ${clinicName} in ${city}. Contact the practice for information.`
      : `${pageName} au ${clinicName}, à ${city}. Informations et contact.`);
  const serviceDescriptionSuffix = locale === 'en'
    ? `Learn about general steps and questions to discuss with the dental team in ${city} before your visit.`
    : `Découvrez les étapes générales et les questions à poser à l’équipe dentaire de ${city} avant votre visite.`;
  const articleDescriptionSuffix = locale === 'en'
    ? `General guidance and questions to discuss with a dental professional in ${city}.`
    : `Repères généraux et conseils à demander au cabinet dentaire de ${city}.`;
  const description = article
    ? extendMetaDescription(contentDescription || routeDescription, articleDescriptionSuffix)
    : service
      ? extendMetaDescription(contentDescription || routeDescription, serviceDescriptionSuffix)
      : metaText(
        localizedRoute === '/'
          ? routeDescription
          : contentDescription && contentDescription.length >= 140
            ? contentDescription
            : routeDescription,
        160,
      );
  const title = seoTitle(localizedRoute === '/' ? (locale === 'en' ? `Dentist in ${city}` : `Cabinet dentaire à ${city}`) : pageName, content.clinic.name, city, locale);
  const informationCampaign = activeCampaigns.find((campaign) => campaign.mediaType === 'video') || activeCampaigns[0];
  const informationPoster = informationCampaign?.imageUrl?.trim()
    || (informationCampaign?.videoUrl ? getYouTubeThumbnailUrl(informationCampaign.videoUrl) || undefined : undefined);
  const imageUrl = article?.imageUrl?.trim() || service?.imageUrl?.trim() || (isInformationRoute ? informationPoster : undefined) || content.hero.imageUrl?.trim() || content.clinic.logoUrl?.trim() || undefined;
  const indexable = indexableSeoConfigured(content);
  const imageAlt = article
    ? (locale === 'en' ? englishBlogPost(article).imageAlt : article.imageAlt?.trim() || `Illustration de l’article : ${pageName}`)
    : service
      ? (locale === 'en' ? englishService(service).imageAlt : service.imageAlt?.trim() || `Illustration du soin : ${pageName}`)
      : isInformationRoute && informationCampaign
        ? (locale === 'en' ? `Thumbnail for ${informationCampaign.titleEn?.trim() || 'practice video'}` : `Miniature de la vidéo : ${informationCampaign.title}`)
        : content.hero.title;
  return <SiteLocaleProvider locale={locale}><DocumentMetadata title={title} description={description} imageUrl={imageUrl} imageAlt={imageAlt} isArticle={!!article} indexable={indexable} locale={locale} currentPath={path} content={content} />{page(content)}</SiteLocaleProvider>;
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
        const normalizedCandidate = candidate.startsWith(`${basePath}/`) ? candidate.slice(basePath.length) : candidate;
        const url = new URL(normalizedCandidate, canonicalBaseUrl || window.location.origin);
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
