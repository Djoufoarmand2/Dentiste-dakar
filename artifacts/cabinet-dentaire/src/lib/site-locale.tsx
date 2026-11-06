import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { SiteContent } from '@workspace/api-client-react';
import { englishBlogPost, englishService } from './cms-translations';

export type SiteLocale = 'fr' | 'en';

const LocaleContext = createContext<SiteLocale>('fr');
const localeStorageKey = 'cabinet-sourire-serein-locale';

const frToEn: Record<string, string> = {
  '/': '/en',
  '/soins': '/en/services',
  '/equipe': '/en/team',
  '/galerie': '/en/gallery',
  '/avis': '/en/reviews',
  '/faq': '/en/faq',
  '/blog': '/en/blog/',
  '/informations': '/en/information',
  '/contact': '/en/contact',
  '/confidentialite': '/en/privacy',
  '/pourquoi-nous-choisir': '/en/why-choose-us',
};

const enToFr: Record<string, string> = Object.fromEntries(
  Object.entries(frToEn).map(([fr, en]) => [en.replace(/\/$/, '') || '/en', fr]),
);

export function SiteLocaleProvider({ locale, children }: { locale: SiteLocale; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'fr';
    try {
      window.localStorage.setItem(localeStorageKey, locale);
    } catch {
      // The URL remains the source of truth if browser storage is unavailable.
    }
  }, [locale]);

  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useSiteLocale() {
  return useContext(LocaleContext);
}

export function rememberedSiteLocale(): SiteLocale {
  try {
    return window.localStorage.getItem(localeStorageKey) === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

function getLocalizedDetailPath(
  path: string,
  targetLocale: SiteLocale,
  content?: SiteContent,
) {
  const servicePath = path.match(/^\/(?:en\/services|soins)\/([^/]+)\/?$/);
  if (servicePath) {
    const sourceSlug = decodeURIComponent(servicePath[1]);
    const service = content?.services.find((item) =>
      item.slug === sourceSlug || item.slugEn === sourceSlug || englishService(item).slug === sourceSlug,
    );
    const slug = targetLocale === 'en'
      ? service ? englishService(service).slug : sourceSlug
      : service?.slug || sourceSlug;
    return targetLocale === 'en' ? `/en/services/${slug}/` : `/soins/${slug}/`;
  }

  const blogPath = path.match(/^\/(?:en\/)?blog\/([^/]+)\/?$/);
  if (blogPath) {
    const sourceSlug = decodeURIComponent(blogPath[1]);
    const post = content?.blogPosts.find((item) =>
      item.slug === sourceSlug || item.slugEn === sourceSlug || englishBlogPost(item).slug === sourceSlug,
    );
    const slug = targetLocale === 'en'
      ? post ? englishBlogPost(post).slug : sourceSlug
      : post?.slug || sourceSlug;
    return targetLocale === 'en' ? `/en/blog/${slug}/` : `/blog/${slug}/`;
  }

  if (targetLocale === 'en' && path.startsWith('/en/')) return path;
  if (targetLocale === 'fr' && !path.startsWith('/en/')) return path;

  if (targetLocale === 'en') return frToEn[path] || `/en${path === '/' ? '' : path}`;
  const normalized = path.replace(/^\/en/, '') || '/';
  return enToFr[path.replace(/\/$/, '') || '/'] || normalized;
}

export function localizedPath(
  currentPath: string,
  targetLocale: SiteLocale,
  content?: SiteContent,
) {
  const hashStart = currentPath.indexOf('#');
  const queryStart = currentPath.indexOf('?');
  const cutAt = [hashStart, queryStart].filter((index) => index >= 0).sort((a, b) => a - b)[0];
  const path = cutAt === undefined ? currentPath : currentPath.slice(0, cutAt);
  const suffix = cutAt === undefined ? '' : currentPath.slice(cutAt);
  return `${getLocalizedDetailPath(path || '/', targetLocale, content)}${suffix}`;
}
