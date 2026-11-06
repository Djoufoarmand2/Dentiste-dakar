import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const outputDirectory = process.env.CABINET_SITEMAP_OUTPUT_DIR
  ? path.resolve(process.env.CABINET_SITEMAP_OUTPUT_DIR)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/public');
const sitemapPath = path.join(outputDirectory, 'sitemap.xml');
const robotsPath = path.join(outputDirectory, 'robots.txt');
const rawBasePath = process.env.BASE_PATH?.trim() || '/';
const basePath = `/${rawBasePath.split('/').filter(Boolean).join('/')}${rawBasePath.split('/').filter(Boolean).length ? '/' : ''}`;
const appPath = (route) => `${basePath}${String(route).replace(/^\/+/, '')}`;
const viteEnv = loadEnv('production', process.cwd(), 'VITE_');
const viteSetting = (name) => process.env[name]?.trim() || viteEnv[name]?.trim();
const cmsTranslations = JSON.parse(await readFile(new URL('../src/lib/cms-translations.json', import.meta.url), 'utf8'));

function englishService(service) {
  const fallback = cmsTranslations.services[service.slug] || cmsTranslations.services[service.id] || {};
  return {
    title: service.titleEn?.trim() || fallback.title || 'Dental service',
    slug: service.slugEn?.trim() || fallback.slugEn || service.slug,
    summary: service.summaryEn?.trim() || fallback.summary || 'An English translation of this service information is being prepared.',
    description: service.descriptionEn?.trim() || fallback.description || 'Please contact the practice for service information in English.',
    purpose: service.purposeEn?.trim() || fallback.purpose || '',
    procedureSteps: service.procedureStepsEn?.trim() || fallback.procedureSteps || '',
    imageAlt: service.imageAltEn?.trim() || fallback.imageAlt || 'Dental care illustration.',
  };
}

function englishBlogPost(post) {
  const fallback = cmsTranslations.blogPosts[post.slug] || cmsTranslations.blogPosts[post.id] || {};
  return {
    title: post.titleEn?.trim() || fallback.title || 'Dental health article',
    slug: post.slugEn?.trim() || fallback.slugEn || post.slug,
    excerpt: post.excerptEn?.trim() || fallback.excerpt || 'An English translation of this article is being prepared.',
    content: post.contentEn?.trim() || fallback.content || 'An English translation of this article is being prepared.',
    author: post.authorEn?.trim() || fallback.author || 'Practice team',
    imageAlt: post.imageAltEn?.trim() || fallback.imageAlt || 'Dental health article illustration.',
  };
}

function englishFaq(faq) {
  const fallback = cmsTranslations.faqs[faq.question] || {};
  return {
    question: faq.questionEn?.trim() || fallback.question || 'An English translation is being prepared.',
    answer: faq.answerEn?.trim() || fallback.answer || 'Please contact the practice for this information in English.',
  };
}

function canonicalOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const isDevelopmentOrLocal = url.hostname === 'localhost'
      || url.hostname === '127.0.0.1'
      || url.hostname.endsWith('.replit.dev');
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || isDevelopmentOrLocal) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

async function disableIndexing() {
  await rm(sitemapPath, { force: true });
  try {
    const robots = await readFile(robotsPath, 'utf8');
    const filtered = robots.split(/\r?\n/).filter((line) => !/^Sitemap:/i.test(line)).join('\n');
    await writeFile(robotsPath, filtered.endsWith('\n') ? filtered : `${filtered}\n`);
    const indexPath = path.join(outputDirectory, 'index.html');
    let html = await readFile(indexPath, 'utf8');
    html = html.replace(/<meta name="robots" content="[^"]*"\s*\/?>/i, '<meta name="robots" content="noindex, nofollow" />');
    html = html.replace(/<link rel="canonical"[^>]*\/?>/i, '');
    html = html.replace(/<meta property="og:url"[^>]*\/?>/i, '');
    await writeFile(indexPath, html);
  } catch {
    // The build has not emitted these files yet; no generated SEO files are needed.
  }
}

const origin = canonicalOrigin(viteSetting('VITE_SITE_URL'));
const indexable = viteSetting('VITE_SITE_INDEXABLE') === 'true';

const fixedRoutes = [
  '/', '/soins/', '/pourquoi-nous-choisir/', '/equipe/', '/galerie/', '/avis/', '/faq/', '/blog/',
  '/informations/', '/contact/', '/confidentialite/',
  '/en/', '/en/services/', '/en/why-choose-us/', '/en/team/', '/en/gallery/', '/en/reviews/',
  '/en/faq/', '/en/blog/', '/en/information/', '/en/contact/', '/en/privacy/',
];
const routes = new Set(fixedRoutes);
const privateRoutes = ['/arm', '/admin', '/sign-in', '/sign-up', '/forgot-password', '/auth/callback'];
let publicContent;
const supabaseUrl = viteSetting('VITE_SUPABASE_URL');
const publishableKey = viteSetting('VITE_SUPABASE_PUBLISHABLE_KEY');
if (supabaseUrl && publishableKey) {
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/cabinet-api/site-content`, {
      headers: { apikey: publishableKey },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      publicContent = await response.json();
      for (const post of publicContent.blogPosts ?? []) {
        if (post?.published === true && typeof post.slug === 'string' && /^[a-z0-9-]+$/.test(post.slug)) {
          routes.add(`/blog/${post.slug}/`);
          const englishSlug = englishBlogPost(post).slug;
          routes.add(`/en/blog/${englishSlug}/`);
        }
      }
      for (const service of publicContent.services ?? []) {
        if (typeof service.slug === 'string' && /^[a-z0-9-]+$/.test(service.slug)
          && service.title && service.summary
          && !isProvisionalCopy(service.title, service.summary)) {
          routes.add(`/soins/${service.slug}/`);
          const englishSlug = englishService(service).slug;
          routes.add(`/en/services/${englishSlug}/`);
        }
      }
    } else {
      console.warn(`Published blog routes and page snapshots could not be loaded (HTTP ${response.status}).`);
    }
  } catch {
    console.warn('Published blog routes and page snapshots could not be loaded from the public CMS.');
  }
} else {
  console.warn('Supabase public-content configuration is missing; blog routes and page snapshots were not generated.');
}

function httpsImageUrl(value) {
  try {
    const image = new URL(value || '');
    return image.protocol === 'https:' ? image.href : undefined;
  } catch {
    return undefined;
  }
}

function httpsVideoUrl(value) {
  try {
    const video = new URL(value || '');
    return video.protocol === 'https:' ? video.href : undefined;
  } catch {
    return undefined;
  }
}

function youtubeVideoDetails(value) {
  try {
    const url = new URL(value || '');
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);
    let id = '';
    if (['youtu.be', 'www.youtu.be'].includes(host)) id = segments[0] || '';
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
      else if (['embed', 'shorts', 'live'].includes(segments[0] || '')) id = segments[1] || '';
    } else if (['youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host) && segments[0] === 'embed') {
      id = segments[1] || '';
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return undefined;
    return {
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  } catch {
    return undefined;
  }
}

const clinicName = publicContent?.clinic?.name?.trim() || 'Cabinet Sourire Serein';
const city = publicContent?.clinic?.city?.trim() || 'Douala';
const siteTitle = truncateMeta(viteSetting('VITE_SITE_TITLE') || `Cabinet dentaire à ${city} | ${clinicName}`, 60);
const siteDescription = truncateMeta(
  viteSetting('VITE_SITE_DESCRIPTION') || publicContent?.hero?.description || `Soins dentaires à ${city}. Contact et informations pratiques du ${clinicName}.`,
  160,
);
const configuredImageUrl = httpsImageUrl(viteSetting('VITE_SITE_OG_IMAGE_URL')) || httpsImageUrl(publicContent?.hero?.imageUrl);
const canIndex = indexable && Boolean(
  origin
  && siteTitle
  && siteDescription
  && configuredImageUrl
  && publicContent?.clinic?.name
  && publicContent?.clinic?.phone
  && publicContent?.clinic?.email
  && publicContent?.clinic?.address
  && !/\.example$/i.test(publicContent.clinic.email)
  && publicContent.clinic.phone.replace(/\D/g, '') !== '237670000000'
  && publicContent.clinic.address.trim().toLowerCase() !== 'bonanjo, douala, cameroun'
  && publicContent.clinic.openingHours?.trim() !== 'Lundi au vendredi · 8h–17h'
  && publicContent?.hero?.title
  && publicContent?.hero?.description
  && !isProvisionalCopy(
    publicContent?.clinic?.name,
    publicContent?.clinic?.phone,
    publicContent?.clinic?.email,
    publicContent?.clinic?.address,
    publicContent?.hero?.title,
    publicContent?.hero?.description,
  ),
);

const frToEnRoutes = new Map([
  ['/', '/en/'],
  ['/soins/', '/en/services/'],
  ['/pourquoi-nous-choisir/', '/en/why-choose-us/'],
  ['/equipe/', '/en/team/'],
  ['/galerie/', '/en/gallery/'],
  ['/avis/', '/en/reviews/'],
  ['/faq/', '/en/faq/'],
  ['/blog/', '/en/blog/'],
  ['/informations/', '/en/information/'],
  ['/contact/', '/en/contact/'],
  ['/confidentialite/', '/en/privacy/'],
]);

function normalizedPublicRoute(route) {
  const trimmed = String(route || '/').replace(/\/+$/, '');
  return trimmed ? `${trimmed}/` : '/';
}

function localizedPublicRoute(route, targetLocale) {
  const current = normalizedPublicRoute(route);
  const isEnglish = current.startsWith('/en/');
  const localPath = isEnglish ? current.replace(/^\/en/, '') || '/' : current;
  if (targetLocale === 'en' && !isEnglish) {
    const serviceMatch = localPath.match(/^\/soins\/([^/]+)\/$/);
    if (serviceMatch) {
      const service = publicContent?.services?.find((item) => item.slug === serviceMatch[1]);
      return `/en/services/${service ? englishService(service).slug : serviceMatch[1]}/`;
    }
    const postMatch = localPath.match(/^\/blog\/([^/]+)\/$/);
    if (postMatch) {
      const post = publicContent?.blogPosts?.find((item) => item.slug === postMatch[1]);
      return `/en/blog/${post ? englishBlogPost(post).slug : postMatch[1]}/`;
    }
    return frToEnRoutes.get(localPath) || null;
  }
  if (targetLocale === 'fr' && isEnglish) {
    const serviceMatch = current.match(/^\/en\/services\/([^/]+)\/$/);
    if (serviceMatch) {
      const service = publicContent?.services?.find((item) => item.slugEn === serviceMatch[1] || item.slug === serviceMatch[1] || englishService(item).slug === serviceMatch[1]);
      return `/soins/${service?.slug || serviceMatch[1]}/`;
    }
    const postMatch = current.match(/^\/en\/blog\/([^/]+)\/$/);
    if (postMatch) {
      const post = publicContent?.blogPosts?.find((item) => item.slugEn === postMatch[1] || item.slug === postMatch[1] || englishBlogPost(item).slug === postMatch[1]);
      return `/blog/${post?.slug || postMatch[1]}/`;
    }
    const pair = [...frToEnRoutes.entries()].find(([, enRoute]) => enRoute === current);
    return pair?.[0] || null;
  }
  return current;
}

function routeAlternates(route) {
  const fr = localizedPublicRoute(route, 'fr');
  const en = localizedPublicRoute(route, 'en');
  if (!fr || !en || !routes.has(fr) || !routes.has(en)) return null;
  return { fr, en };
}

const indexPath = path.join(outputDirectory, 'index.html');
await mkdir(outputDirectory, { recursive: true });
if (!canIndex) {
  await disableIndexing();
  console.log('Cabinet site kept noindex: set a public HTTPS URL and VITE_SITE_INDEXABLE=true after confirming the business information.');
} else {
  const urls = [...routes].map((route) => `${origin}${route === '/' ? '/' : route.endsWith('/') ? route : `${route}/`}`);
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...[...routes].map((route, index) => {
      const alternates = routeAlternates(route);
      const links = alternates
        ? `\n    <xhtml:link rel="alternate" hreflang="fr-CM" href="${escapeXml(`${origin}${alternates.fr}`)}" />\n    <xhtml:link rel="alternate" hreflang="en-CM" href="${escapeXml(`${origin}${alternates.en}`)}" />\n    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${origin}${alternates.fr}`)}" />`
        : '';
      return `  <url><loc>${escapeXml(urls[index])}</loc>${links}\n  </url>`;
    }),
    '</urlset>',
    '',
  ].join('\n');
  await writeFile(sitemapPath, xml);

  let html = await readFile(indexPath, 'utf8');
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeXml(siteTitle)}</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*("\s*\/?>)/i, `$1${escapeXml(siteDescription)}$2`);
  html = html.replace(/<meta name="robots" content="[^"]*"\s*\/?>/i, '<meta name="robots" content="index, follow" />');
  html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapeXml(siteTitle)}" />`);
  html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapeXml(siteDescription)}" />`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${escapeXml(siteTitle)}" />`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${escapeXml(siteDescription)}" />`);
  html = html.replace(/<\/head>/i, `    <meta property="og:image" content="${escapeXml(configuredImageUrl)}" />\n    <meta name="twitter:image" content="${escapeXml(configuredImageUrl)}" />\n  </head>`);
  await writeFile(indexPath, html);

  let robots = '';
  try {
    robots = await readFile(robotsPath, 'utf8');
  } catch {
    robots = 'User-agent: *\nAllow: /\n';
  }
  robots = robots.split(/\r?\n/)
    .filter((line) => !/^Sitemap:/i.test(line) && !(canIndex && /noindex|non-indexable|non indexable/i.test(line)))
    .join('\n')
    .trimEnd();
  await writeFile(robotsPath, `${robots}\nSitemap: ${origin}/sitemap.xml\n`);
  console.log(`Generated sitemap for ${urls.length} public routes.`);
}

function truncateMeta(value, maximum) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maximum) return normalized;
  const shortened = normalized.slice(0, maximum - 1).replace(/\s+\S*$/, '').trimEnd();
  return `${shortened || normalized.slice(0, maximum - 1).trimEnd()}…`;
}

function seoTitle(pageName, clinicName) {
  const suffix = ` | ${clinicName}`;
  const maximumPrefix = Math.max(12, 60 - suffix.length);
  if (pageName.length <= maximumPrefix) return `${pageName}${suffix}`;
  const shortened = pageName.slice(0, maximumPrefix - 1).replace(/\s+\S*$/, '').trimEnd();
  return `${shortened || pageName.slice(0, maximumPrefix - 1).trimEnd()}…${suffix}`;
}

function escapeAttribute(value) {
  return escapeXml(String(value ?? ''));
}

function replaceMeta(html, attribute, key, value) {
  const keyPattern = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}="${keyPattern}")[^>]*>`, 'i');
  const tag = value ? `<meta ${attribute}="${key}" content="${escapeAttribute(value)}" />` : '';
  if (pattern.test(html)) return html.replace(pattern, tag);
  return tag ? html.replace(/<\/head>/i, `    ${tag}\n  </head>`) : html;
}

function replaceCanonical(html, href) {
  const pattern = /<link\b(?=[^>]*\brel="canonical")[^>]*>/i;
  if (!href) return html.replace(pattern, '');
  const tag = `<link rel="canonical" href="${escapeAttribute(href)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace(/<\/head>/i, `    ${tag}\n  </head>`);
}

function pageMetadata(route) {
  const clinic = publicContent?.clinic ?? {};
  const name = clinic.name || 'Cabinet Sourire Serein';
  const city = clinic.city || 'Douala';
  const canonicalRoute = normalizedPublicRoute(route);
  const english = canonicalRoute.startsWith('/en/');
  const locale = english ? 'en' : 'fr';
  const normalizedRoute = (english ? canonicalRoute.replace(/^\/en/, '') || '/' : canonicalRoute).replace(/\/+$/, '') || '/';
  const articleSlug = normalizedRoute.match(/^\/blog\/([^/]+)$/)?.[1];
  const serviceSlug = normalizedRoute.match(/^\/(?:soins|services)\/([^/]+)$/)?.[1];
  const article = articleSlug
    ? (publicContent?.blogPosts ?? []).find((post) => post.published && (post.slug === articleSlug || post.slugEn === articleSlug || englishBlogPost(post).slug === articleSlug))
    : undefined;
  const service = serviceSlug
    ? (publicContent?.services ?? []).find((item) => item.slug === serviceSlug || item.slugEn === serviceSlug || englishService(item).slug === serviceSlug)
    : undefined;
  const translatedArticle = article ? englishBlogPost(article) : undefined;
  const translatedService = service ? englishService(service) : undefined;
  const activeCampaigns = (publicContent?.campaigns ?? []).filter((campaign) => campaign.active);
  const activeVideoCampaigns = activeCampaigns.filter((campaign) => campaign.mediaType === 'video' && campaign.videoUrl);
  const videoCampaignSummary = activeCampaigns.slice(0, 2).map((campaign) => english
    ? [campaign.titleEn?.trim(), campaign.descriptionEn?.trim()].filter(Boolean).join(' — ')
    : [campaign.title?.trim(), campaign.description?.trim()].filter(Boolean).join(' — ')).filter(Boolean).join(' ');
  const informationDescription = english
    ? `Watch practice videos and read current campaigns from ${name} in ${city}.${videoCampaignSummary ? ` ${videoCampaignSummary}` : ''}`
    : `Regardez les vidéos et actualités de ${name}, cabinet dentaire à ${city}.${videoCampaignSummary ? ` ${videoCampaignSummary}` : ''}`;
  const pageNames = english ? {
    '/services': `Dental services in ${city}`,
    '/why-choose-us': 'Why choose our practice',
    '/team': `Dental team in ${city}`,
    '/gallery': `Practice photos in ${city}`,
    '/reviews': `Reviews of the dental practice in ${city}`,
    '/faq': 'Dental care frequently asked questions',
    '/blog': `Dental health articles in ${city}`,
    '/information': `Dental practice news and videos in ${city}`,
    '/contact': `Contact and appointments in ${city}`,
    '/privacy': 'Privacy policy',
  } : {
    '/soins': `Soins dentaires à ${city}`,
    '/pourquoi-nous-choisir': 'Pourquoi choisir notre cabinet',
    '/equipe': `Équipe du cabinet dentaire à ${city}`,
    '/galerie': `Photos du cabinet dentaire à ${city}`,
    '/avis': `Avis sur le cabinet dentaire à ${city}`,
    '/faq': 'Questions fréquentes sur les soins dentaires',
    '/blog': `Conseils dentaires à ${city}`,
    '/informations': `Actualités et vidéos du cabinet dentaire à ${city}`,
    '/contact': `Contact et rendez-vous à ${city}`,
    '/confidentialite': 'Politique de confidentialité',
  };
  const pageName = (english ? translatedArticle?.title || translatedService?.title : article?.title || service?.title)
    || (normalizedRoute === '/' ? (english ? `Dentist in ${city}` : `Cabinet dentaire à ${city}`) : pageNames[normalizedRoute] || (english ? (article ? 'Dental health article' : service ? 'Dental service' : 'Dental practice') : 'Cabinet dentaire'));
  const title = seoTitle(pageName, name);
  const descriptions = english ? {
    '/services': `Explore dental services presented by ${name} in ${city}. Contact the practice to request a consultation.`,
    '/why-choose-us': `Learn how ${name}, a dental practice in ${city}, approaches patient care and communication.`,
    '/team': `Meet the team and learn about ${name}, a dental practice in ${city}.`,
    '/gallery': `View photos and visual information about ${name} in ${city}.`,
    '/reviews': `Read visitor reviews shared about ${name}, a dental practice in ${city}.`,
    '/faq': `Answers to common questions about dental care, appointments and first visits in ${city}.`,
    '/blog': `General information about oral health and dental care in ${city}.`,
    '/information': informationDescription,
    '/contact': `Contact ${name}, a dental practice in ${city}, to ask a question or request an appointment.`,
    '/privacy': 'Information about how this website collects, uses and protects personal data.',
  } : {
    '/soins': `Découvrez les soins dentaires présentés par ${name} à ${city}. Contactez le cabinet pour organiser une consultation.`,
    '/pourquoi-nous-choisir': `Découvrez la façon dont ${name}, cabinet dentaire à ${city}, vous accompagne et répond à vos questions.`,
    '/equipe': `Découvrez l’équipe et les informations présentées par ${name}, cabinet dentaire à ${city}.`,
    '/galerie': `Découvrez en images les espaces et la vie du cabinet dentaire ${name} à ${city}.`,
    '/avis': `Lisez les avis publiés sur ${name}, cabinet dentaire à ${city}, et partagez votre expérience.`,
    '/faq': `Réponses aux questions fréquentes sur les soins dentaires, les rendez-vous et la première visite à ${city}.`,
    '/blog': `Articles et informations générales sur l’hygiène bucco-dentaire et les soins dentaires à ${city}.`,
    '/informations': informationDescription,
    '/contact': `Contactez ${name}, cabinet dentaire à ${city}, pour demander des renseignements ou un rendez-vous.`,
    '/confidentialite': 'Informations sur la collecte, l’utilisation et la protection de vos données personnelles sur le site.',
  };
  const description = truncateMeta(
    (english ? translatedArticle?.excerpt || translatedService?.summary : article?.excerpt || service?.summary)
      || (normalizedRoute === '/' ? (english ? publicContent?.hero?.descriptionEn?.trim() || publicContent?.hero?.description : publicContent?.hero?.description) : undefined)
      || descriptions[normalizedRoute]
      || (english ? `${pageName} at ${name} in ${city}. Contact the practice for information.` : `${pageName} au ${name}, à ${city}. Informations et contact.`),
    160,
  );
  const informationCampaign = activeCampaigns.find((campaign) => campaign.mediaType === 'video') || activeCampaigns[0];
  const videoThumbnail = informationCampaign?.videoUrl ? youtubeVideoDetails(informationCampaign.videoUrl)?.thumbnailUrl : undefined;
  const socialImage = httpsImageUrl(article?.imageUrl)
    || httpsImageUrl(service?.imageUrl)
    || (normalizedRoute === '/informations' || normalizedRoute === '/information' ? httpsImageUrl(informationCampaign?.imageUrl) || videoThumbnail : undefined)
    || httpsImageUrl(publicContent?.hero?.imageUrl)
    || configuredImageUrl;
  const canonical = canIndex && origin ? `${origin}${canonicalRoute === '/' ? '/' : canonicalRoute}` : undefined;
  const imageAlt = article
    ? (english ? translatedArticle?.imageAlt || 'Dental health article illustration.' : article.imageAlt?.trim() || `Illustration de l’article : ${pageName}`)
    : service
      ? (english ? translatedService?.imageAlt || 'Dental care illustration.' : service.imageAlt?.trim() || `Illustration du soin : ${pageName}`)
    : (normalizedRoute === '/informations' || normalizedRoute === '/information') && informationCampaign
      ? (english ? `Thumbnail for ${informationCampaign.titleEn?.trim() || 'practice video'}` : `Miniature de la vidéo : ${informationCampaign.title}`)
    : publicContent?.hero?.title;
  return { title, description, socialImage, canonical, canonicalRoute, type: article ? 'article' : 'website', article, service, videoCampaigns: activeVideoCampaigns, clinicName: name, locale, imageAlt };
}

function withPageMetadata(template, route) {
  const meta = pageMetadata(route);
  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttribute(meta.title)}</title>`);
  html = html.replace(/<html\b([^>]*)\blang="[^"]*"/i, `<html$1lang="${meta.locale}"`);
  html = replaceMeta(html, 'name', 'description', meta.description);
  html = replaceMeta(html, 'name', 'robots', canIndex ? 'index, follow' : 'noindex, nofollow');
  html = replaceMeta(html, 'property', 'og:title', meta.title);
  html = replaceMeta(html, 'property', 'og:description', meta.description);
  html = replaceMeta(html, 'property', 'og:type', meta.type);
  html = replaceMeta(html, 'property', 'og:site_name', meta.clinicName);
  html = replaceMeta(html, 'property', 'og:locale', meta.locale === 'en' ? 'en_CM' : 'fr_CM');
  html = replaceMeta(html, 'property', 'og:url', meta.canonical);
  html = replaceMeta(html, 'property', 'og:image', meta.socialImage);
  html = replaceMeta(html, 'property', 'og:image:alt', meta.socialImage ? meta.imageAlt || meta.title : undefined);
  html = replaceMeta(html, 'name', 'twitter:title', meta.title);
  html = replaceMeta(html, 'name', 'twitter:description', meta.description);
  html = replaceMeta(html, 'name', 'twitter:image', meta.socialImage);
  html = replaceMeta(html, 'name', 'twitter:card', meta.socialImage ? 'summary_large_image' : 'summary');
  const alternate = routeAlternates(route);
  const hreflang = canIndex && alternate
    ? `<link rel="alternate" hreflang="fr-CM" href="${escapeAttribute(`${origin}${alternate.fr}`)}" />\n    <link rel="alternate" hreflang="en-CM" href="${escapeAttribute(`${origin}${alternate.en}`)}" />\n    <link rel="alternate" hreflang="x-default" href="${escapeAttribute(`${origin}${alternate.fr}`)}" />`
    : '';
  html = html.replace(/<\/head>/i, `${structuredDataTags(meta)}\n    ${hreflang}\n  </head>`);
  return replaceCanonical(html, meta.canonical);
}

function structuredDataTags(meta) {
  if (!canIndex || !origin || !publicContent?.clinic) return '';
  const clinic = publicContent.clinic;
  const dentist = {
    '@type': 'Dentist',
    '@id': `${origin}/#dentist`,
    name: clinic.name || clinicName,
    url: origin,
    image: httpsImageUrl(meta.socialImage) || configuredImageUrl,
    telephone: clinic.phone || undefined,
    email: clinic.email || undefined,
    address: clinic.address ? {
      '@type': 'PostalAddress',
      streetAddress: clinic.address,
      addressLocality: clinic.city || city,
      addressCountry: 'CM',
    } : undefined,
    areaServed: clinic.city ? { '@type': 'City', name: clinic.city } : undefined,
  };
  const website = {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name: clinic.name || clinicName,
    url: origin,
    inLanguage: meta.locale === 'en' ? 'en-CM' : 'fr-CM',
  };
  const graph = [website, dentist];
  if (meta.article && meta.canonical) {
    const translated = englishBlogPost(meta.article);
    graph.push({
      '@type': 'BlogPosting',
      '@id': `${meta.canonical}#article`,
      headline: meta.locale === 'en' ? translated.title : meta.article.title,
      description: meta.locale === 'en' ? translated.excerpt : meta.article.excerpt,
      image: httpsImageUrl(meta.article.imageUrl) || undefined,
      datePublished: meta.article.date || undefined,
      author: {
        '@type': 'Organization',
        name: meta.locale === 'en' ? translated.author : meta.article.author || clinicName,
      },
      publisher: { '@type': 'Organization', name: clinicName },
      mainEntityOfPage: meta.canonical,
      inLanguage: meta.locale === 'en' ? 'en-CM' : 'fr-CM',
    });
  }
  if (meta.canonicalRoute === '/informations/' || meta.canonicalRoute === '/en/information/') {
    for (const campaign of meta.videoCampaigns ?? []) {
      const title = meta.locale === 'en' ? campaign.titleEn?.trim() || 'Dental practice video' : campaign.title?.trim();
      const description = meta.locale === 'en'
        ? campaign.descriptionEn?.trim() || 'Video update from the dental practice.'
        : campaign.description?.trim();
      const youtube = youtubeVideoDetails(campaign.videoUrl);
      const contentUrl = httpsVideoUrl(campaign.videoUrl);
      const thumbnail = httpsImageUrl(campaign.imageUrl) || youtube?.thumbnailUrl;
      const publishedAt = campaign.publishedAt && !Number.isNaN(Date.parse(campaign.publishedAt))
        ? new Date(campaign.publishedAt).toISOString()
        : undefined;
      if (!title || !description || !thumbnail || (!youtube?.embedUrl && !contentUrl) || !meta.canonical) continue;
      graph.push({
        '@type': 'VideoObject',
        '@id': `${meta.canonical}#video-${encodeURIComponent(campaign.id)}`,
        name: title,
        description,
        thumbnailUrl: [thumbnail],
        uploadDate: publishedAt,
        embedUrl: youtube?.embedUrl,
        contentUrl: youtube ? undefined : contentUrl,
        transcript: meta.locale === 'en' ? campaign.transcriptEn?.trim() || undefined : campaign.transcript?.trim() || undefined,
        publisher: { '@type': 'Organization', name: clinicName },
        mainEntityOfPage: meta.canonical,
        inLanguage: meta.locale === 'en' ? 'en-CM' : 'fr-CM',
      });
    }
  }
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
    .replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

function withPrivateNoindex(template, route) {
  const pageTitle = route === '/arm' || route === '/admin'
    ? 'Espace administrateur'
    : 'Connexion';
  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttribute(pageTitle)} | ${escapeAttribute(clinicName)}</title>`);
  html = replaceMeta(html, 'name', 'robots', 'noindex, nofollow');
  html = replaceMeta(html, 'property', 'og:url', undefined);
  html = replaceMeta(html, 'property', 'og:image', undefined);
  html = replaceMeta(html, 'name', 'twitter:image', undefined);
  return replaceCanonical(html, undefined);
}

function blogImageAlt(post, locale = 'fr') {
  const english = locale === 'en';
  return english
    ? englishBlogPost(post).imageAlt
    : post.imageAlt || `Illustration dentaire liée à l’article : ${post.title}`;
}

function contentText(value) {
  const source = String(value ?? '');
  return source.split(/(https:\/\/[^\s<>"']+)/g).map((part) => {
    if (!part.startsWith('https://')) return escapeXml(part).replaceAll('\n', '<br />');
    return `<a href="${escapeAttribute(part)}" rel="noopener noreferrer">${escapeXml(part)}</a>`;
  }).join('');
}

function renderArticleContent(content) {
  return String(content ?? '').split(/\n{2,}/).map((block) => block.trim()).filter(Boolean).map((block) => {
    const heading = block.match(/^##\s+(.+)$/);
    return heading ? `<h2>${escapeXml(heading[1])}</h2>` : `<p>${contentText(block)}</p>`;
  }).join('\n');
}

function renderBlogMarkup(route) {
  const canonicalRoute = normalizedPublicRoute(route);
  const english = canonicalRoute.startsWith('/en/');
  const localRoute = (english ? canonicalRoute.replace(/^\/en/, '') || '/' : canonicalRoute).replace(/\/+$/, '') || '/';
  const posts = (publicContent?.blogPosts ?? []).filter((post) => post.published && /^[a-z0-9-]+$/.test(post.slug || ''));
  if (localRoute === '/blog') {
    const cards = posts.map((post) => {
      const translated = englishBlogPost(post);
      const slug = english ? translated.slug : post.slug;
      const title = english ? translated.title : post.title;
      const excerpt = english ? translated.excerpt : post.excerpt;
      const image = httpsImageUrl(post.imageUrl);
      return `<article><a href="${escapeAttribute(appPath(`${english ? '/en/blog' : '/blog'}/${slug}/`))}">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(blogImageAlt(post, english ? 'en' : 'fr'))}" loading="lazy" decoding="async" />` : ''}<h2>${escapeXml(title)}</h2><p>${escapeXml(excerpt)}</p><span>${english ? 'Read article' : 'Lire l’article'}</span></a></article>`;
    }).join('\n');
    return `<main><h1>${english ? `Dental health articles in ${escapeXml(publicContent?.clinic?.city || 'Douala')}` : `Conseils dentaires à ${escapeXml(publicContent?.clinic?.city || 'Douala')}`}</h1><p>${english ? 'General information about oral health and dental care. Discuss personal questions with a dental professional.' : 'Des informations générales sur les soins dentaires et la santé bucco-dentaire, à compléter par les conseils de votre praticien.'}</p>${cards || `<p>${english ? 'Articles will be published soon.' : 'Les articles seront publiés prochainement.'}</p>`}</main>`;
  }
  const slug = localRoute.match(/^\/blog\/([^/]+)$/)?.[1];
  const post = posts.find((entry) => english
    ? englishBlogPost(entry).slug === slug || entry.slug === slug
    : entry.slug === slug);
  if (!post) return '';
  const translated = englishBlogPost(post);
  const title = english ? translated.title : post.title;
  const excerpt = english ? translated.excerpt : post.excerpt;
  const content = english ? translated.content : post.content;
  const author = english ? translated.author : post.author;
  const image = httpsImageUrl(post.imageUrl)
    ? `<img src="${escapeAttribute(httpsImageUrl(post.imageUrl))}" alt="${escapeAttribute(blogImageAlt(post, english ? 'en' : 'fr'))}" fetchpriority="high" decoding="async" />`
    : '';
  return `<main><a href="${escapeAttribute(appPath(english ? '/en/blog/' : '/blog/'))}">${english ? 'All articles' : 'Tous les articles'}</a><article><time datetime="${escapeAttribute(post.date)}">${escapeXml(post.date)} · ${escapeXml(author)}</time><h1>${escapeXml(title)}</h1><p>${escapeXml(excerpt)}</p>${image}<div>${renderArticleContent(content)}</div></article></main>`;
}

function isProvisionalCopy(...values) {
  return values.some((value) => /démonstration|fictif|fictive|exemple de contenu|à remplacer|à valider|à renseigner|à confirmer/i.test(String(value ?? '')));
}

function renderServiceMarkup(english = false) {
  const services = (publicContent?.services ?? []).filter((service) =>
    service.title && service.summary && !isProvisionalCopy(service.title, service.summary));
  if (!services.length) return `<p>${english ? 'Service information will be published soon.' : 'Les informations sur les soins seront publiées prochainement.'}</p>`;
  return `<ul>${services.map((service) => {
    const translated = englishService(service);
    const slug = english ? translated.slug : service.slug;
    const title = english ? translated.title : service.title;
    const summary = english ? translated.summary : service.summary;
    return `<li><article><h2><a href="${escapeAttribute(appPath(`${english ? '/en/services' : '/soins'}/${slug}/`))}">${escapeXml(title)}</a></h2><p>${escapeXml(summary)}</p><a href="${escapeAttribute(appPath(`${english ? '/en/services' : '/soins'}/${slug}/`))}">${english ? 'Read more' : 'En savoir plus'}</a></article></li>`;
  }).join('')}</ul>`;
}

function renderPublicMarkup(route, meta) {
  const clinic = publicContent?.clinic ?? {};
  const hero = publicContent?.hero ?? {};
  const cityName = clinic.city || city;
  const english = meta.locale === 'en';
  const canonicalRoute = normalizedPublicRoute(route);
  const normalizedRoute = (english ? canonicalRoute.replace(/^\/en/, '') || '/' : canonicalRoute).replace(/\/+$/, '') || '/';
  const heading = `<h1>${escapeXml(meta.title.split(' | ')[0])}</h1>`;
  const intro = `<p>${escapeXml(meta.description)}</p>`;
  if (!publicContent) return `<main>${heading}${intro}</main>`;

  if (normalizedRoute === '/') {
    const heroImage = httpsImageUrl(hero.imageUrl);
    const eyebrow = english ? hero.eyebrowEn || `Dental practice in ${cityName}` : hero.eyebrow;
    const heroTitle = english ? hero.titleEn || `Attentive dental care in ${cityName}.` : hero.title;
    const heroDescription = english ? hero.descriptionEn || `Cabinet Sourire Serein welcomes patients at Clinique La Bienveillance in ${cityName} for dental consultations and care.` : hero.description;
    const action = english ? hero.primaryActionEn || 'Contact the practice' : hero.primaryAction || 'Contacter le cabinet';
    return `<main><section>${eyebrow ? `<p>${escapeXml(eyebrow)}</p>` : ''}<h1>${escapeXml(heroTitle || meta.title)}</h1><p>${escapeXml(heroDescription || meta.description)}</p>${heroImage ? `<img src="${escapeAttribute(heroImage)}" alt="${escapeAttribute(heroTitle || 'Dental practice in ' + cityName)}" fetchpriority="high" decoding="async" />` : ''}<p><a href="${escapeAttribute(appPath(english ? '/en/contact' : '/contact'))}">${escapeXml(action)}</a></p></section><section><h2>${english ? 'Dental services' : 'Soins dentaires'}</h2>${renderServiceMarkup(english)}</section><section><h2>${english ? 'Why choose our practice?' : 'Pourquoi choisir notre cabinet ?'}</h2><p>${english ? 'Clear information, time to ask questions and a conversation shaped around your needs.' : 'Des informations claires, du temps pour poser vos questions et un échange adapté à vos besoins.'}</p><a href="${escapeAttribute(appPath(english ? '/en/why-choose-us' : '/pourquoi-nous-choisir'))}">${english ? 'Learn more' : 'En savoir plus'}</a></section></main>`;
  }
  if (normalizedRoute === '/soins' || normalizedRoute === '/services') {
    return `<main>${heading}${intro}${renderServiceMarkup(english)}</main>`;
  }
  const serviceMatch = normalizedRoute.match(/^\/(?:soins|services)\/([^/]+)$/);
  if (serviceMatch) {
    const service = (publicContent.services ?? []).find((item) => item.slug === serviceMatch[1] || item.slugEn === serviceMatch[1] || englishService(item).slug === serviceMatch[1]);
    if (!service) return `<main>${heading}<p>${english ? 'This service page could not be found.' : 'Cette fiche de soin est introuvable.'}</p></main>`;
    const translated = englishService(service);
    const title = english ? translated.title : service.title;
    const summary = english ? translated.summary : service.summary;
    const description = english ? translated.description : service.description;
    const purpose = english ? translated.purpose : service.purpose;
    const steps = (english ? translated.procedureSteps : service.procedureSteps)?.split(/\r?\n/).filter(Boolean) || [];
    const image = httpsImageUrl(service.imageUrl);
    const whatsapp = 'https://wa.me/237677873442';
    return `<main><a href="${escapeAttribute(appPath(english ? '/en/services/' : '/soins/'))}">${english ? 'All services' : 'Tous les soins'}</a><article><h1>${escapeXml(title)}</h1><p>${escapeXml(summary)}</p>${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(english ? translated.imageAlt : service.imageAlt || title)}" fetchpriority="high" decoding="async" />` : ''}<h2>${english ? 'About this care' : 'À propos de ce soin'}</h2><p>${escapeXml(description)}</p>${purpose ? `<h2>${english ? 'What is this care for?' : 'À quoi sert ce soin ?'}</h2><p>${escapeXml(purpose)}</p>` : ''}<h2>${english ? 'Your visit, step by step' : 'Votre parcours, étape par étape'}</h2>${steps.length ? `<ol>${steps.map((step) => `<li>${escapeXml(step)}</li>`).join('')}</ol>` : `<p>${english ? 'The practice will explain the general steps and options based on your situation.' : 'Le cabinet vous expliquera les étapes générales et les options selon votre situation.'}</p>`}<h2>${english ? 'Questions about this service?' : 'Une question sur ce soin ?'}</h2><p>${english ? 'Contact the practice for information and to discuss your request.' : 'Contactez le cabinet pour obtenir des renseignements et échanger sur votre demande.'}</p><p><a href="${escapeAttribute(whatsapp)}" rel="noopener noreferrer" target="_blank">WhatsApp +237 677 873 442</a> · <a href="mailto:bienveillanceclinique4@gmail.com">bienveillanceclinique4@gmail.com</a></p></article></main>`;
  }
  if (normalizedRoute === '/pourquoi-nous-choisir' || normalizedRoute === '/why-choose-us') {
    const page = publicContent.whyChoose ?? {
      eyebrow: 'Le cabinet · Douala',
      title: 'Votre sourire, notre attention à chaque étape.',
      intro: 'Choisir un cabinet, c’est aussi choisir la façon dont on vous accueille. Au Cabinet Sourire Serein, nous voulons que chaque échange soit clair, attentif et respectueux de votre rythme.',
      titleEn: 'Your smile, our care at every step.',
      introEn: 'Choosing a dental practice is also choosing how you will be welcomed. At Cabinet Sourire Serein, we want every conversation to feel clear, attentive and respectful of your pace.',
      valuesEyebrow: 'Notre manière de vous accompagner',
      valuesTitle: 'Des repères simples, dès le premier échange.',
      valuesEyebrowEn: 'How we support you',
      valuesTitleEn: 'A few clear things to expect from the first conversation.',
      values: [
        { title: 'Être écouté', body: 'Vos questions, vos attentes et vos préoccupations ont leur place dans la conversation.', titleEn: 'A chance to be heard', bodyEn: 'Your questions, expectations and concerns all have a place in the conversation.' },
        { title: 'Comprendre les soins', body: 'Les informations vous sont présentées avec des mots clairs afin que vous puissiez poser vos questions.', titleEn: 'Clear information', bodyEn: 'Information is shared in plain language so you can ask the questions that matter to you.' },
        { title: 'Avancer à votre rythme', body: 'Vous pouvez échanger avec l’équipe et prendre le temps de comprendre les options proposées.', titleEn: 'At your own pace', bodyEn: 'You can talk things through with the team and take time to understand the options discussed.' },
      ],
      partnerEyebrow: 'Un environnement de soins',
      partnerTitle: 'Le Cabinet Sourire Serein, en lien avec la Clinique La Bienveillance.',
      partnerBody: 'Le cabinet dentaire vous accueille à Douala dans l’environnement de la Clinique La Bienveillance.',
      partnerTitleEn: 'Cabinet Sourire Serein, connected with Clinique La Bienveillance.',
      partnerBodyEn: 'The dental practice welcomes patients in Douala within the setting of Clinique La Bienveillance.',
    };
    const choose = (fr, en) => english ? en || fr || 'English translation not yet available.' : fr || '';
    const values = (page.values || []).map((value) => `<section><h2>${escapeXml(choose(value.title, value.titleEn))}</h2><p>${escapeXml(choose(value.body, value.bodyEn))}</p></section>`).join('');
    return `<main>${page.eyebrow || page.eyebrowEn ? `<p>${escapeXml(choose(page.eyebrow, page.eyebrowEn))}</p>` : ''}<h1>${escapeXml(choose(page.title, page.titleEn))}</h1><p>${escapeXml(choose(page.intro, page.introEn))}</p><section><h2>${escapeXml(choose(page.valuesEyebrow, page.valuesEyebrowEn))}</h2><h3>${escapeXml(choose(page.valuesTitle, page.valuesTitleEn))}</h3>${values}</section><section><h2>${escapeXml(choose(page.partnerTitle, page.partnerTitleEn))}</h2><p>${escapeXml(choose(page.partnerBody, page.partnerBodyEn))}</p></section></main>`;
  }
  if (normalizedRoute === '/equipe' || normalizedRoute === '/team') {
    const members = (publicContent.team ?? []).filter((member) =>
      member.name && member.role && !isProvisionalCopy(member.name, member.role, member.biography));
    const items = members.map((member) => `<article><h2>${escapeXml(member.name)}</h2><p>${escapeXml(english ? member.roleEn || 'Dental care professional' : member.role)}</p>${(english ? member.biographyEn : member.biography) ? `<p>${escapeXml(english ? member.biographyEn : member.biography)}</p>` : ''}${httpsImageUrl(member.imageUrl) ? `<img src="${escapeAttribute(httpsImageUrl(member.imageUrl))}" alt="${escapeAttribute(english ? `Portrait of ${member.name}` : `Portrait de ${member.name}`)}" loading="lazy" decoding="async" />` : ''}</article>`).join('');
    return `<main>${heading}${intro}${items || `<p>${english ? 'Team information will be published soon.' : 'Les informations de l’équipe seront publiées prochainement.'}</p>`}</main>`;
  }
  if (normalizedRoute === '/galerie' || normalizedRoute === '/gallery') {
    const images = (publicContent.gallery ?? []).filter((image) => httpsImageUrl(image.imageUrl) && image.alt && !isProvisionalCopy(image.alt));
    const items = images.map((image) => `<figure><img src="${escapeAttribute(httpsImageUrl(image.imageUrl))}" alt="${escapeAttribute(english ? image.altEn || 'Photo of the dental practice.' : image.alt)}" loading="lazy" decoding="async" /><figcaption>${escapeXml(english ? image.altEn || 'Photo of the dental practice.' : image.alt)}</figcaption></figure>`).join('');
    return `<main>${heading}${intro}${items || `<p>${english ? 'Practice photos will be published soon.' : 'Les photos du cabinet seront publiées prochainement.'}</p>`}</main>`;
  }
  if (normalizedRoute === '/avis' || normalizedRoute === '/reviews') {
    const reviews = (publicContent.testimonials ?? []).filter((review) =>
      review.quote && !isProvisionalCopy(review.name, review.quote, review.service));
    const items = reviews.map((review) => `<article><h2>${escapeXml(review.name || (english ? 'Visitor review' : 'Avis de visiteur'))}</h2>${review.service ? `<p>${escapeXml(english ? review.serviceEn || 'Dental care' : review.service)}</p>` : ''}<blockquote>${escapeXml(review.quote)}</blockquote>${english && !review.quoteEn ? '<p><small>Review originally submitted in French.</small></p>' : ''}</article>`).join('');
    return `<main>${heading}${intro}${items || `<p>${english ? 'Reviews will appear after they have been approved.' : 'Les avis seront affichés après leur validation.'}</p>`}</main>`;
  }
  if (normalizedRoute === '/faq') {
    const faqs = (publicContent.faqs ?? []).filter((faq) =>
      faq.question && faq.answer && !isProvisionalCopy(faq.question, faq.answer));
    const items = faqs.map((faq) => {
      const translated = englishFaq(faq);
      return `<details><summary>${escapeXml(english ? translated.question : faq.question)}</summary><p>${escapeXml(english ? translated.answer : faq.answer)}</p></details>`;
    }).join('');
    return `<main>${heading}${intro}${items || `<p>${english ? 'Answers to common questions will be published soon.' : 'Les réponses aux questions fréquentes seront publiées prochainement.'}</p>`}</main>`;
  }
  if (normalizedRoute === '/informations' || normalizedRoute === '/information') {
    const campaigns = (publicContent.campaigns ?? []).filter((campaign) => campaign.active);
    const campaignsMarkup = campaigns.map((campaign) => {
      const title = english ? campaign.titleEn?.trim() || 'Practice video' : campaign.title;
      const description = english ? campaign.descriptionEn?.trim() || 'News and information from the dental practice.' : campaign.description;
      const youtube = campaign.mediaType === 'video' ? youtubeVideoDetails(campaign.videoUrl) : undefined;
      const directVideo = campaign.mediaType === 'video' ? httpsVideoUrl(campaign.videoUrl) : undefined;
      const image = httpsImageUrl(campaign.imageUrl);
      const thumbnail = image || youtube?.thumbnailUrl;
      const media = campaign.mediaType === 'video'
        ? youtube
          ? `<iframe src="${escapeAttribute(youtube.embedUrl)}" title="${escapeAttribute(english ? `Campaign video: ${title}` : `Vidéo de la campagne : ${title}`)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`
          : directVideo
            ? `<video src="${escapeAttribute(directVideo)}" ${thumbnail ? `poster="${escapeAttribute(thumbnail)}"` : ''} controls playsinline preload="metadata" aria-label="${escapeAttribute(title)}"></video>`
            : ''
        : image
          ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(title)}" loading="lazy" decoding="async" />`
          : '';
      const publishedAt = campaign.publishedAt && !Number.isNaN(Date.parse(campaign.publishedAt))
        ? `<time datetime="${escapeAttribute(new Date(campaign.publishedAt).toISOString())}">${escapeXml(new Date(campaign.publishedAt).toLocaleDateString(english ? 'en' : 'fr-FR', { dateStyle: 'long' }))}</time>`
        : '';
      const transcript = english ? campaign.transcriptEn?.trim() : campaign.transcript?.trim();
      const transcriptMarkup = campaign.mediaType === 'video' && transcript
        ? `<details><summary>${english ? 'Read the video transcript' : 'Lire la transcription de la vidéo'}</summary><p>${escapeXml(transcript).replace(/\r?\n/g, '<br />')}</p></details>`
        : '';
      const sourceLink = youtube
        ? `<p><a href="${escapeAttribute(campaign.videoUrl)}" target="_blank" rel="noopener noreferrer">${english ? 'Open the video on YouTube' : 'Ouvrir la vidéo sur YouTube'}</a></p>`
        : '';
      return `<article><div>${media}</div><h2>${escapeXml(title)}</h2><p>${escapeXml(description)}</p>${publishedAt}${sourceLink}${transcriptMarkup}</article>`;
    }).join('');
    const empty = english ? 'Practice updates and videos will appear here when available.' : 'Les actualités et vidéos du cabinet seront publiées ici dès qu’elles seront disponibles.';
    const informationHeading = english
      ? `Dental practice news and videos in ${cityName}`
      : `Actualités et vidéos du cabinet dentaire à ${cityName}`;
    return `<main><h1>${escapeXml(informationHeading)}</h1><p>${escapeXml(meta.description)}</p>${campaignsMarkup || `<p>${empty}</p>`}</main>`;
  }
  if (normalizedRoute === '/contact') {
    const rows = [
      clinic.address ? `<p><strong>${english ? 'Address' : 'Adresse'}:</strong> ${escapeXml(clinic.address)}</p>` : '',
      clinic.phone ? `<p><strong>${english ? 'Phone' : 'Téléphone'}:</strong> <a href="tel:${escapeAttribute(clinic.phone)}">${escapeXml(clinic.phone)}</a></p>` : '',
      clinic.email ? `<p><strong>Email:</strong> <a href="mailto:${escapeAttribute(clinic.email)}">${escapeXml(clinic.email)}</a></p>` : '',
      clinic.openingHours ? `<p><strong>${english ? 'Opening hours' : 'Horaires'}:</strong> ${escapeXml(clinic.openingHours)}</p>` : '',
    ].filter(Boolean).join('');
    return `<main>${heading}${intro}${rows || `<p>${english ? `Contact the dental practice in ${escapeXml(cityName)} for its address and opening hours.` : `Contactez le cabinet dentaire à ${escapeXml(cityName)} pour obtenir ses coordonnées et horaires.`}</p>`}</main>`;
  }
  if (normalizedRoute === '/confidentialite' || normalizedRoute === '/privacy') {
    const policy = publicContent.privacyPolicy ?? {
      eyebrow: 'Vos informations',
      title: 'Confidentialité',
      description: 'Cette page décrit les données demandées par le site, les services utilisés et la suppression manuelle décidée par le cabinet.',
      eyebrowEn: 'Your information',
      titleEn: 'Privacy',
      descriptionEn: 'This page explains what information the website asks for, which services are used and how the practice handles deletion requests.',
      controllerName: 'Djoufo Armand',
      sections: [
        { title: 'Gestion et suppression des données', body: 'Le cabinet décide de la suppression des avis et des demandes qu’il reçoit ; l’application ne leur applique pas de délai automatique.', titleEn: 'Data handling and deletion', bodyEn: 'The practice decides when to delete reviews and requests it receives; the application does not apply an automatic retention period.' },
        { title: 'Demandes de rendez-vous', body: 'Le formulaire demande un nom, un numéro de téléphone, une adresse e-mail et un soin souhaité ; la date et le message sont facultatifs. Évitez d’indiquer des informations médicales sensibles.', titleEn: 'Appointment requests', bodyEn: 'The form asks for your name, phone number, email address and the service you are interested in; the preferred date and message are optional. Please avoid sensitive medical details.' },
        { title: 'Avis publics', body: 'Le formulaire d’avis recueille un nom d’affichage, une note, un commentaire et l’autorisation de publication. L’avis est visible publiquement et peut être retiré par le cabinet.', titleEn: 'Public reviews', bodyEn: 'The review form collects a display name, rating, comment and permission to publish. The review is visible publicly and can be removed by the practice.' },
        { title: 'Conservation et demandes de données', body: 'Les avis sont enregistrés dans Supabase et restent visibles jusqu’à leur suppression par l’administrateur ; aucun effacement automatique n’est configuré. Le cabinet supprime manuellement les demandes.', titleEn: 'Retention and data requests', bodyEn: 'Reviews are stored in Supabase and remain visible until an administrator removes them; no automatic deletion period is configured. The practice manually removes requests.' },
      ],
      contactTitle: 'Questions ou demande de suppression',
      contactIntro: 'Pour contacter le responsable du traitement, demander l’accès ou la suppression de données :',
      contactTitleEn: 'Questions or deletion requests',
      contactIntroEn: 'To contact the data controller or request access to or deletion of data:',
    };
    const choose = (fr, en) => english ? en || fr || 'English translation not yet available.' : fr || '';
    const sections = (policy.sections || []).map((section) => `<section><h2>${escapeXml(choose(section.title, section.titleEn))}</h2><p>${escapeXml(choose(section.body, section.bodyEn))}</p></section>`).join('');
    return `<main><p>${escapeXml(choose(policy.eyebrow, policy.eyebrowEn))}</p><h1>${escapeXml(choose(policy.title, policy.titleEn))}</h1><p>${escapeXml(choose(policy.description, policy.descriptionEn))}</p><section><h2>${english ? 'Data controller' : 'Responsable du traitement'}</h2><p>${escapeXml(clinic.name)} · ${escapeXml(clinic.address)} · ${escapeXml(clinic.phone)} · ${escapeXml(clinic.email)}</p><p>${escapeXml(policy.controllerName)}</p></section>${sections}<section><h2>${escapeXml(choose(policy.contactTitle, policy.contactTitleEn))}</h2><p>${escapeXml(choose(policy.contactIntro, policy.contactIntroEn))} ${escapeXml(clinic.email)} · ${escapeXml(clinic.phone)}</p></section></main>`;
  }
  return `<main>${heading}${intro}</main>`;
}

const baseTemplate = await readFile(indexPath, 'utf8');
const routesToRender = [...routes];
for (const route of routesToRender) {
  const metadata = pageMetadata(route);
  const localRoute = route.replace(/^\/en(?=\/|$)/, '') || '/';
  const body = localRoute.replace(/\/+$/, '') === '/blog' || localRoute.startsWith('/blog/')
    ? renderBlogMarkup(route)
    : renderPublicMarkup(route, metadata);
  const prerendered = withPageMetadata(baseTemplate, route).replace(
    /<div id="root"><\/div>/i,
    `<div id="root" data-seo-prerender="${escapeAttribute(route)}">${body}</div>`,
  );
  if (!prerendered.includes(`data-seo-prerender="${escapeAttribute(route)}"`)) {
    console.warn(`Could not prerender route ${route}: app root was not present in the HTML template.`);
    continue;
  }
  const routeDirectory = route === '/' ? outputDirectory : path.join(outputDirectory, ...route.slice(1).split('/'));
  await mkdir(routeDirectory, { recursive: true });
  await writeFile(path.join(routeDirectory, 'index.html'), prerendered);
}

for (const route of privateRoutes) {
  const html = withPrivateNoindex(baseTemplate, route).replace(
    /<div id="root"><\/div>/i,
    `<div id="root" data-seo-prerender="${escapeAttribute(route)}"><main><h1>Accès réservé</h1></main></div>`,
  );
  const routeDirectory = path.join(outputDirectory, ...route.slice(1).split('/'));
  await mkdir(routeDirectory, { recursive: true });
  await writeFile(path.join(routeDirectory, 'index.html'), html);
}

if (publicContent) console.log(`Generated initial HTML snapshots for ${routesToRender.length} public routes; indexing ${canIndex ? 'enabled' : 'disabled'}.`);
