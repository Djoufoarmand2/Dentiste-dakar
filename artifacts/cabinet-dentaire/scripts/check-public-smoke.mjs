import assert from 'node:assert/strict';

const rawBaseUrl = process.env.CABINET_BASE_URL;
assert.ok(rawBaseUrl, 'Set CABINET_BASE_URL to the running Cabinet Naya preview.');
const baseUrl = new URL(rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`);
const faviconUrl = new URL('favicon-logo-v2.png', baseUrl);
const appleTouchIconUrl = new URL('apple-touch-icon.png', baseUrl);
const routes = [
  '/', '/soins', '/equipe', '/galerie', '/avis', '/faq', '/blog',
  '/informations', '/contact', '/confidentialite', '/admin', '/sign-in',
  '/sign-up', '/forgot-password', '/auth/callback',
];

for (const route of routes) {
  const response = await fetch(new URL(route.replace(/^\//, ''), baseUrl));
  assert.equal(response.status, 200, `${route} should serve the SPA shell`);
  assert.match(response.headers.get('content-type') || '', /text\/html/i, `${route} should return HTML`);
  const html = await response.text();
  assert.match(html, /<div id="root"><\/div>/, `${route} should include the app root`);
  assert.ok(html.includes(`href="${faviconUrl.pathname}"`), `${route} should reference the versioned clinic favicon`);
  assert.ok(html.includes(`href="${appleTouchIconUrl.pathname}"`), `${route} should reference the Apple touch icon`);
  assert.match(html, /<meta name="robots" content="noindex, nofollow"/i, `${route} should stay non-indexable while data is provisional`);
  assert.doesNotMatch(html, /property="og:url"[^>]+replit\.(?:dev|app)/i, `${route} must not advertise the preview URL as canonical`);
}

for (const [url, label] of [
  [faviconUrl, 'favicon'],
  [appleTouchIconUrl, 'Apple touch icon'],
]) {
  const response = await fetch(url);
  assert.equal(response.status, 200, `${label} should be served`);
  assert.match(response.headers.get('content-type') || '', /image\/png/i, `${label} should be a PNG image`);
  assert.ok(Number(response.headers.get('content-length') || 0) > 0, `${label} should not be empty`);
}

const robotsResponse = await fetch(new URL('robots.txt', baseUrl));
assert.equal(robotsResponse.status, 200, 'robots.txt should be served');
assert.match(await robotsResponse.text(), /User-agent:\s*\*/i);

console.log(`Public smoke check passed for ${routes.length} direct routes; appointment/contact form was not submitted.`);
