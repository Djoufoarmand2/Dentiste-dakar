import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SiteContent } from '@workspace/api-client-react';
import { AuthProvider, useCabinetSession } from '@/components/auth-provider';
import { usePublicContent } from '@/lib/cms';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

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
    && !!content.hero.description?.trim()
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

function PublicRoute({ page }: { page: (content: SiteContent) => ReactNode }) {
  const query = usePublicContent();
  const [location] = useLocation();
  if (query.isLoading) return <main className="grid min-h-[100dvh] place-items-center bg-background px-5" role="status" aria-live="polite"><p className="animate-pulse text-sm text-muted-foreground">Chargement du site…</p></main>;
  if (query.isError || !query.data) return <main className="grid min-h-[100dvh] place-items-center bg-background px-5"><section className="max-w-xl rounded-2xl border border-border bg-card p-8 text-center" role="alert"><h1 className="font-display text-2xl text-[#073e53]">Le site n’a pas pu charger ses informations</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Réessayez dans quelques instants.</p><button onClick={() => void query.refetch()} className="btn-gold mt-6">Réessayer</button></section></main>;

  const rawPath = location.split('?')[0] || '/';
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath;
  const pathParts = path.split('/').filter(Boolean);
  const article = pathParts[0] === 'blog'
    ? query.data.blogPosts.find((post) => post.slug === pathParts[1] && post.published)
    : undefined;
  const pageNames: Record<string, string> = {
    '/': 'Accueil',
    '/soins': 'Soins dentaires',
    '/equipe': 'Équipe du cabinet dentaire',
    '/galerie': 'Photos du cabinet dentaire',
    '/avis': 'Avis sur le cabinet dentaire',
    '/faq': 'Questions fréquentes',
    '/blog': 'Conseils dentaires',
    '/informations': 'Informations pratiques',
    '/contact': 'Contact et rendez-vous',
    '/confidentialite': 'Confidentialité',
  };
  const pageName = article?.title || pageNames[path] || 'Cabinet Sourire Serein';
  const clinicName = query.data.clinic.name;
  const city = query.data.clinic.city;
  const routeDescriptions: Record<string, string> = {
    '/soins': `Découvrez les soins dentaires présentés par ${clinicName} à ${city}. Contactez le cabinet pour organiser une consultation.`,
    '/equipe': `Découvrez l’équipe et les informations présentées par ${clinicName}, cabinet dentaire à ${city}.`,
    '/galerie': `Découvrez en images les espaces et la vie du cabinet dentaire ${clinicName} à ${city}.`,
    '/avis': `Lisez les avis publiés sur ${clinicName}, cabinet dentaire à ${city}, et partagez votre expérience.`,
    '/faq': `Réponses aux questions fréquentes sur les soins dentaires, les rendez-vous et la première visite à ${city}.`,
    '/blog': `Articles et informations générales sur l’hygiène bucco-dentaire et les soins dentaires à ${city}.`,
    '/informations': `Retrouvez les coordonnées et les informations pratiques communiquées pour ${clinicName} à ${city}.`,
    '/contact': `Contactez ${clinicName}, cabinet dentaire à ${city}, pour demander des renseignements ou un rendez-vous.`,
    '/confidentialite': 'Informations sur la collecte, l’utilisation et la protection de vos données personnelles sur le site.',
  };
  const description = metaText(article?.excerpt || (path === '/'
    ? query.data.hero.description
    : routeDescriptions[path] || `${pageName} au ${clinicName}, à ${city}. Informations et contact.`), 160);
  const title = seoTitle(path === '/' ? `Cabinet dentaire à ${query.data.clinic.city}` : pageName, query.data.clinic.name);
  const imageUrl = article?.imageUrl?.trim() || query.data.hero.imageUrl?.trim() || query.data.clinic.logoUrl?.trim() || undefined;
  return <><DocumentMetadata title={title} description={description} imageUrl={imageUrl} imageAlt={article ? `Illustration de l’article : ${article.title}` : query.data.hero.title} isArticle={!!article} indexable={indexableSeoConfigured(query.data)} />{page(query.data)}</>;
}

function DocumentMetadata({ title, description, imageUrl, imageAlt, isArticle = false, indexable = false }: { title: string; description: string; imageUrl?: string; imageAlt?: string; isArticle?: boolean; indexable?: boolean }) {
  useEffect(() => {
    document.title = title;
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

    let pathname = window.location.pathname;
    if (basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))) pathname = pathname.slice(basePath.length) || '/';
    if (pathname.length > 1) pathname = pathname.replace(/\/+$/, '');
    if (/^\/blog(?:\/.*)?$/.test(pathname)) pathname = `${pathname}/`;
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
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', 'fr_CM');
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
  }, [description, imageAlt, imageUrl, indexable, isArticle, title]);

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
  return <RouteErrorBoundary><Switch>
    <Route path="/" component={() => <PublicRoute page={(content) => <LazyHomePage content={content} />} />} />
    <Route path="/soins" component={() => <PublicRoute page={(content) => <LazyServicesPage content={content} />} />} />
    <Route path="/equipe" component={() => <PublicRoute page={(content) => <LazyTeamPage content={content} />} />} />
    <Route path="/galerie" component={() => <PublicRoute page={(content) => <LazyGalleryPage content={content} />} />} />
    <Route path="/avis" component={() => <PublicRoute page={(content) => <LazyReviewsPage content={content} />} />} />
    <Route path="/faq" component={() => <PublicRoute page={(content) => <LazyFAQPage content={content} />} />} />
    <Route path="/blog" component={() => <PublicRoute page={(content) => <LazyBlogPage content={content} />} />} />
    <Route path="/blog/:slug" component={({ params }) => <PublicRoute page={(content) => <LazyBlogArticlePage content={content} slug={params.slug} />} />} />
    <Route path="/informations" component={() => <PublicRoute page={(content) => <LazyInformationPage content={content} />} />} />
    <Route path="/contact" component={() => <PublicRoute page={(content) => <LazyContactPage content={content} />} />} />
    <Route path="/confidentialite" component={() => <PublicRoute page={(content) => <LazyPrivacyPage content={content} />} />} />
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
