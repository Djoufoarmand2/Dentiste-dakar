import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadEnv } from 'vite';

const viteEnv = loadEnv('production', process.cwd(), 'VITE_');
const viteSetting = (name) => process.env[name]?.trim() || viteEnv[name]?.trim();
const cmsTranslations = JSON.parse(await readFile(new URL('../src/lib/cms-translations.json', import.meta.url), 'utf8'));
const englishService = (service) => {
  const fallback = cmsTranslations.services[service.slug] || cmsTranslations.services[service.id] || {};
  return {
    slug: service.slugEn?.trim() || fallback.slugEn || service.slug,
    title: service.titleEn?.trim() || fallback.title || 'Dental service',
  };
};
const englishBlogPost = (post) => {
  const fallback = cmsTranslations.blogPosts[post.slug] || cmsTranslations.blogPosts[post.id] || {};
  return {
    slug: post.slugEn?.trim() || fallback.slugEn || post.slug,
    title: post.titleEn?.trim() || fallback.title || 'Dental health article',
  };
};
const rawBaseUrl = process.env.CABINET_BASE_URL;
assert.ok(rawBaseUrl, 'Set CABINET_BASE_URL to the running Cabinet Sourire Serein preview.');
const baseUrl = new URL(rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`);
const supabaseUrl = viteSetting('VITE_SUPABASE_URL');
const publishableKey = viteSetting('VITE_SUPABASE_PUBLISHABLE_KEY');
assert.ok(supabaseUrl && publishableKey, 'Set the site Supabase runtime configuration before running this check.');
let contentResponse;
try {
  contentResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/cabinet-api/site-content`, {
    headers: { apikey: publishableKey },
    signal: AbortSignal.timeout(10_000),
  });
} catch {
  throw new Error('Site Supabase runtime public-content request failed; connection details were suppressed.');
}
assert.equal(contentResponse.status, 200, `Site Supabase runtime public-content request should return HTTP 200 (received ${contentResponse.status}).`);
assert.match(contentResponse.headers.get('content-type') || '', /application\/json/i, 'Site Supabase runtime public-content response should be JSON.');
let publicContent;
try {
  publicContent = await contentResponse.json();
} catch {
  throw new Error('Site Supabase runtime public-content response was not valid JSON; response details were suppressed.');
}
assert.ok(publicContent && typeof publicContent === 'object' && !Array.isArray(publicContent), 'Site Supabase runtime should return a public content object.');
assert.ok(publicContent.clinic && typeof publicContent.clinic === 'object', 'Public content should include clinic information.');
assert.ok(publicContent.hero && typeof publicContent.hero === 'object', 'Public content should include hero content.');
for (const collection of ['services', 'team', 'gallery', 'testimonials', 'faqs', 'blogPosts', 'campaigns']) {
  assert.ok(Array.isArray(publicContent[collection]), `Public content should include the ${collection} collection.`);
}
function canonicalOrigin(value) {
  try {
    const url = new URL(value || '');
    const localOrPreview = url.hostname === 'localhost'
      || url.hostname === '127.0.0.1'
      || url.hostname.endsWith('.replit.dev');
    return url.protocol === 'https:' && url.pathname === '/' && !url.search && !url.hash && !localOrPreview
      ? url.origin
      : null;
  } catch {
    return null;
  }
}
function isHttpsUrl(value) {
  try {
    return new URL(value || '').protocol === 'https:';
  } catch {
    return false;
  }
}
function isProvisionalCopy(...values) {
  return values.some((value) => /démonstration|fictif|fictive|exemple de contenu|à remplacer|à valider|à renseigner|à confirmer/i.test(String(value ?? '')));
}
const productionOrigin = canonicalOrigin(viteSetting('VITE_SITE_URL'));
const sharingImage = viteSetting('VITE_SITE_OG_IMAGE_URL') || publicContent.hero.imageUrl;
const indexingEnabled = viteSetting('VITE_SITE_INDEXABLE') === 'true'
  && !!productionOrigin
  && !!publicContent.clinic.name?.trim()
  && !!publicContent.clinic.address?.trim()
  && !!publicContent.clinic.phone?.trim()
  && !!publicContent.clinic.email?.trim()
  && !/\.example$/i.test(publicContent.clinic.email)
  && publicContent.clinic.phone.replace(/\D/g, '') !== '237670000000'
  && publicContent.clinic.address.trim().toLowerCase() !== 'bonanjo, douala, cameroun'
  && publicContent.clinic.openingHours?.trim() !== 'Lundi au vendredi · 8h–17h'
  && !!publicContent.hero.description?.trim()
  && !isProvisionalCopy(publicContent.clinic.name, publicContent.clinic.address, publicContent.clinic.phone, publicContent.clinic.email, publicContent.hero.title, publicContent.hero.description)
  && isHttpsUrl(sharingImage);
const faviconResources = [
  {
    url: new URL('favicon.ico', baseUrl),
    label: 'ICO favicon',
    contentType: /image\/(?:x-icon|vnd\.microsoft\.icon)/i,
  },
  {
    url: new URL('favicon-32.png', baseUrl),
    label: '32px favicon',
    contentType: /image\/png/i,
  },
  {
    url: new URL('favicon-logo-v2.png', baseUrl),
    label: '128px favicon',
    contentType: /image\/png/i,
  },
];
const appleTouchIconUrl = new URL('apple-touch-icon.png', baseUrl);
const iconResources = [...faviconResources, {
  url: appleTouchIconUrl,
  label: 'Apple touch icon',
  contentType: /image\/png/i,
}];
const routes = [
  '/', '/soins/', '/pourquoi-nous-choisir/', '/equipe/', '/galerie/', '/avis/', '/faq/', '/blog/',
  '/informations/', '/contact/', '/confidentialite/',
  '/en/', '/en/services/', '/en/why-choose-us/', '/en/team/', '/en/gallery/', '/en/reviews/',
  '/en/faq/', '/en/blog/', '/en/information/', '/en/contact/', '/en/privacy/',
  '/arm', '/admin', '/sign-in',
  '/sign-up', '/forgot-password', '/auth/callback',
  ...publicContent.blogPosts.filter((post) => post.published && /^[a-z0-9-]+$/.test(post.slug || '')).map((post) => `/blog/${post.slug}/`),
  ...publicContent.blogPosts.filter((post) => post.published && /^[a-z0-9-]+$/.test(englishBlogPost(post).slug || '')).map((post) => `/en/blog/${englishBlogPost(post).slug}/`),
  ...publicContent.services.filter((service) => /^[a-z0-9-]+$/.test(service.slug || '') && service.title && service.summary && !isProvisionalCopy(service.title, service.summary)).map((service) => `/soins/${service.slug}/`),
  ...publicContent.services.filter((service) => /^[a-z0-9-]+$/.test(englishService(service).slug || '') && service.title && service.summary && !isProvisionalCopy(service.title, service.summary)).map((service) => `/en/services/${englishService(service).slug}/`),
];

for (const route of routes) {
  const response = await fetch(new URL(route.replace(/^\//, ''), baseUrl));
  assert.equal(response.status, 200, `${route} should serve the SPA shell`);
  assert.match(response.headers.get('content-type') || '', /text\/html/i, `${route} should return HTML`);
  const html = await response.text();
  assert.match(html, /<div id="root"(?:\s[^>]*)?>/, `${route} should include the app root`);
  for (const icon of iconResources) {
    assert.ok(html.includes(`href="${icon.url.pathname}"`), `${route} should reference the ${icon.label}`);
  }
  const privateRoute = ['/arm', '/admin', '/sign-in', '/sign-up', '/forgot-password', '/auth/callback'].includes(route);
  if (!indexingEnabled || privateRoute) {
    assert.match(html, /<meta name="robots" content="noindex, nofollow"/i, `${route} should remain noindex until public SEO is enabled`);
  } else {
    assert.match(html, /<meta name="robots" content="index, follow"/i, `${route} should be indexable after the production SEO gate is enabled`);
    assert.match(html, /<link rel="canonical" href="https:\/\//i, `${route} should have an HTTPS canonical URL`);
    assert.match(html, /<script type="application\/ld\+json">/i, `${route} should include business structured data`);
  }
  assert.doesNotMatch(html, /property="og:url"[^>]+replit\.dev/i, `${route} must not advertise the preview URL as canonical`);
  const articleMatch = route.match(/^\/(?:en\/)?blog\/([^/]+)\/?$/);
  if (articleMatch) {
    const englishArticle = route.startsWith('/en/');
    const post = publicContent.blogPosts.find((candidate) => englishArticle
      ? englishBlogPost(candidate).slug === articleMatch[1] || candidate.slug === articleMatch[1]
      : candidate.slug === articleMatch[1]);
    assert.ok(post?.imageUrl, `${route} should have a published illustration`);
    assert.match(html, /data-seo-prerender="\/(?:en\/)?blog\/[a-z0-9-]+\/"/, `${route} should include a static article snapshot`);
    assert.ok(html.includes(post.imageUrl), `${route} should expose its article image before JavaScript runs`);
    assert.match(html, /property="og:image"[^>]+content="https:\/\//i, `${route} should expose a hosted social-sharing image`);
    assert.match(html, /<h1>[^<]+<\/h1>/i, `${route} should expose its heading before JavaScript runs`);
    assert.match(html, /<img\b[^>]*\balt="[^"]+"/i, `${route} should expose descriptive image alt text`);
  }
  if (route === '/blog/' || route === '/en/blog/') {
    assert.match(html, /data-seo-prerender="\/(?:en\/)?blog\/"/, 'Blog listing should include a static snapshot');
    for (const post of publicContent.blogPosts.filter((candidate) => candidate.published)) {
      const expectedSlug = route === '/en/blog/' ? englishBlogPost(post).slug : post.slug;
      assert.ok(html.includes(expectedSlug), `Blog listing should link to ${expectedSlug}`);
    }
  }
  const serviceMatch = route.match(/^\/(?:en\/)?(?:soins|services)\/([^/]+)\/?$/);
  if (serviceMatch) {
    const isEnglishService = route.startsWith('/en/');
    const service = publicContent.services.find((candidate) => isEnglishService
      ? englishService(candidate).slug === serviceMatch[1] || candidate.slug === serviceMatch[1]
      : candidate.slug === serviceMatch[1]);
    assert.ok(service, `${route} should correspond to a CMS service`);
    assert.match(html, /<h1>[^<]+<\/h1>/i, `${route} should expose a service heading`);
    if (html.includes('data-seo-prerender=')) {
      assert.ok(html.includes('bienveillanceclinique4@gmail.com'), `${route} should expose the clinic email in its static snapshot`);
      assert.ok(html.includes('677873442'), `${route} should expose the WhatsApp contact in its static snapshot`);
    }
  }
}

for (const icon of iconResources) {
  const response = await fetch(icon.url);
  assert.equal(response.status, 200, `${icon.label} should be served`);
  assert.match(response.headers.get('content-type') || '', icon.contentType, `${icon.label} should have a browser-compatible image type`);
  assert.ok(Number(response.headers.get('content-length') || 0) > 0, `${icon.label} should not be empty`);
}

const robotsResponse = await fetch(new URL('robots.txt', baseUrl));
assert.equal(robotsResponse.status, 200, 'robots.txt should be served');
const robots = await robotsResponse.text();
assert.match(robots, /User-agent:\s*\*/i);
if (/^Sitemap:/im.test(robots)) {
  const sitemapUrl = robots.match(/^Sitemap:\s*(\S+)/im)?.[1];
  assert.ok(sitemapUrl, 'robots.txt sitemap declaration should have a URL');
  const sitemapResponse = await fetch(sitemapUrl);
  assert.equal(sitemapResponse.status, 200, 'Declared sitemap should be served');
  const sitemap = await sitemapResponse.text();
  assert.match(sitemap, /^<\?xml\b/i, 'Sitemap should be XML rather than the SPA fallback');
  for (const post of publicContent.blogPosts.filter((candidate) => candidate.published)) {
    assert.ok(sitemap.includes(`/blog/${post.slug}`), `Sitemap should include ${post.slug}`);
      const translated = englishBlogPost(post);
      assert.ok(sitemap.includes(`/en/blog/${translated.slug}`), `Sitemap should include English article ${translated.slug}`);
  }
  for (const service of publicContent.services.filter((item) => item.slug && item.title && item.summary && !isProvisionalCopy(item.title, item.summary))) {
    assert.ok(sitemap.includes(`/soins/${service.slug}`), `Sitemap should include service ${service.slug}`);
      const translated = englishService(service);
      assert.ok(sitemap.includes(`/en/services/${translated.slug}`), `Sitemap should include English service ${translated.slug}`);
  }
  if (indexingEnabled) {
    assert.match(sitemap, /hreflang="fr-CM"/, 'Indexable sitemap should include French language alternates');
    assert.match(sitemap, /hreflang="en-CM"/, 'Indexable sitemap should include English language alternates');
  }
} else {
  assert.equal(indexingEnabled, false, 'An indexable production build should publish its sitemap.');
  assert.match(robots, /noindex|validation|en préparation/i, 'Sitemap may be withheld while the site remains non-indexable');
}

console.log(`Public smoke check passed for ${routes.length} direct routes, including published blog articles; appointment/contact form was not submitted.`);
console.log('Site Supabase runtime and initial blog SEO checks passed; Supabase management access was not tested.');
