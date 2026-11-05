import assert from 'node:assert/strict';
import { loadEnv } from 'vite';

const viteEnv = loadEnv('production', process.cwd(), 'VITE_');
const viteSetting = (name) => process.env[name]?.trim() || viteEnv[name]?.trim();
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
const productionOrigin = canonicalOrigin(viteSetting('VITE_SITE_URL'));
const sharingImage = viteSetting('VITE_SITE_OG_IMAGE_URL') || publicContent.hero.imageUrl;
const indexingEnabled = viteSetting('VITE_SITE_INDEXABLE') === 'true'
  && !!productionOrigin
  && !!publicContent.clinic.name?.trim()
  && !!publicContent.hero.description?.trim()
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
  '/', '/soins', '/equipe', '/galerie', '/avis', '/faq', '/blog/',
  '/informations', '/contact', '/confidentialite', '/arm', '/admin', '/sign-in',
  '/sign-up', '/forgot-password', '/auth/callback',
  ...publicContent.blogPosts.filter((post) => post.published && /^[a-z0-9-]+$/.test(post.slug || '')).map((post) => `/blog/${post.slug}/`),
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
  if (route.startsWith('/blog/') && route !== '/blog/') {
    const post = publicContent.blogPosts.find((candidate) => route.replace(/\/+$/, '') === `/blog/${candidate.slug}`);
    assert.ok(post?.imageUrl, `${route} should have a published illustration`);
    assert.match(html, /data-seo-prerender="\/blog\/[a-z0-9-]+\/"/, `${route} should include a static article snapshot`);
    assert.ok(html.includes(post.imageUrl), `${route} should expose its article image before JavaScript runs`);
    assert.match(html, /property="og:image"[^>]+content="https:\/\//i, `${route} should expose a hosted social-sharing image`);
    assert.match(html, /<h1>[^<]+<\/h1>/i, `${route} should expose its heading before JavaScript runs`);
  }
  if (route === '/blog/') {
    assert.match(html, /data-seo-prerender="\/blog\/"/, 'Blog listing should include a static snapshot');
    for (const post of publicContent.blogPosts.filter((candidate) => candidate.published)) {
      assert.ok(html.includes(post.slug), `Blog listing should link to ${post.slug}`);
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
  }
} else {
  assert.equal(indexingEnabled, false, 'An indexable production build should publish its sitemap.');
  assert.match(robots, /noindex|validation|en préparation/i, 'Sitemap may be withheld while the site remains non-indexable');
}

console.log(`Public smoke check passed for ${routes.length} direct routes, including published blog articles; appointment/contact form was not submitted.`);
console.log('Site Supabase runtime and initial blog SEO checks passed; Supabase management access was not tested.');
