import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDirectory = process.env.CABINET_SITEMAP_OUTPUT_DIR
  ? path.resolve(process.env.CABINET_SITEMAP_OUTPUT_DIR)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/public');
const sitemapPath = path.join(outputDirectory, 'sitemap.xml');
const robotsPath = path.join(outputDirectory, 'robots.txt');
const rawBasePath = process.env.BASE_PATH?.trim() || '/';
const basePath = `/${rawBasePath.split('/').filter(Boolean).join('/')}${rawBasePath.split('/').filter(Boolean).length ? '/' : ''}`;
const appPath = (route) => `${basePath}${String(route).replace(/^\/+/, '')}`;

function canonicalOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const isPreviewOrLocal = url.hostname === 'localhost'
      || url.hostname === '127.0.0.1'
      || url.hostname.endsWith('.replit.dev')
      || url.hostname.endsWith('.replit.app');
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || isPreviewOrLocal) return null;
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

const origin = canonicalOrigin(process.env.VITE_SITE_URL?.trim());
const indexable = process.env.VITE_SITE_INDEXABLE === 'true';
const siteTitle = process.env.VITE_SITE_TITLE?.trim();
const siteDescription = process.env.VITE_SITE_DESCRIPTION?.trim();
const configuredImage = process.env.VITE_SITE_OG_IMAGE_URL?.trim();
const configuredImageUrl = (() => {
  try {
    const image = new URL(configuredImage || '');
    return image.protocol === 'https:' ? image.href : undefined;
  } catch {
    return undefined;
  }
})();
const canIndex = indexable && !!origin && !!siteTitle && !!siteDescription && !!configuredImageUrl;

const fixedRoutes = [
  '/', '/soins', '/equipe', '/galerie', '/avis', '/faq', '/blog/',
  '/informations', '/contact', '/confidentialite',
];
const routes = new Set(fixedRoutes);
let publicContent;
const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
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

const indexPath = path.join(outputDirectory, 'index.html');
await mkdir(outputDirectory, { recursive: true });
if (!canIndex) {
  await disableIndexing();
  console.log('Cabinet site kept noindex: official URL, title, description and HTTPS sharing image must all be configured to enable indexing.');
} else {
  const urls = [...routes].map((route) => `${origin}${route === '/' ? '/' : route}`);
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`),
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
  robots = robots.split(/\r?\n/).filter((line) => !/^Sitemap:/i.test(line)).join('\n').trimEnd();
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
  const name = clinic.name || 'Clinique Sourire Serein';
  const city = clinic.city || 'Douala';
  const normalizedRoute = route.replace(/\/+$/, '') || '/';
  const article = normalizedRoute.startsWith('/blog/')
    ? (publicContent?.blogPosts ?? []).find((post) => post.published && normalizedRoute === `/blog/${post.slug}`)
    : undefined;
  const titles = {
    '/soins': `Soins dentaires à ${city}`,
    '/equipe': `Notre équipe dentaire à ${city}`,
    '/galerie': `Le cabinet dentaire à ${city}`,
    '/avis': `Avis sur la clinique dentaire à ${city}`,
    '/faq': `Questions fréquentes sur les soins dentaires`,
    '/blog': `Conseils dentaires à ${city}`,
    '/informations': `Informations pratiques sur le cabinet`,
    '/contact': `Contacter un cabinet dentaire à ${city}`,
    '/confidentialite': 'Politique de confidentialité',
  };
  const pageName = article?.title || (route === '/' ? `Cabinet dentaire à ${city}` : titles[route] || 'Cabinet dentaire');
  const title = seoTitle(pageName, name);
  const description = truncateMeta(
    article?.excerpt
      || (route === '/' ? publicContent?.hero?.description : undefined)
      || (route === '/blog'
        ? `Conseils et articles d’information générale sur les soins dentaires à ${city}.`
        : `${pageName} au ${name}, à ${city}. Informations pratiques et contact.`),
    160,
  );
  const socialImage = article?.imageUrl || publicContent?.hero?.imageUrl || configuredImageUrl;
  const canonicalRoute = normalizedRoute === '/blog' || normalizedRoute.startsWith('/blog/') ? `${normalizedRoute}/` : normalizedRoute;
  const canonical = canIndex && origin ? `${origin}${canonicalRoute === '/' ? '/' : canonicalRoute}` : undefined;
  return { title, description, socialImage, canonical, type: article ? 'article' : 'website', article, clinicName: name };
}

function withPageMetadata(template, route) {
  const meta = pageMetadata(route);
  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${escapeAttribute(meta.title)}</title>`);
  html = replaceMeta(html, 'name', 'description', meta.description);
  html = replaceMeta(html, 'name', 'robots', canIndex ? 'index, follow' : 'noindex, nofollow');
  html = replaceMeta(html, 'property', 'og:title', meta.title);
  html = replaceMeta(html, 'property', 'og:description', meta.description);
  html = replaceMeta(html, 'property', 'og:type', meta.type);
  html = replaceMeta(html, 'property', 'og:site_name', meta.clinicName);
  html = replaceMeta(html, 'property', 'og:locale', 'fr_CM');
  html = replaceMeta(html, 'property', 'og:url', meta.canonical);
  html = replaceMeta(html, 'property', 'og:image', meta.socialImage);
  html = replaceMeta(html, 'property', 'og:image:alt', meta.socialImage ? (meta.article ? `Illustration de l’article : ${meta.article.title}` : meta.title) : undefined);
  html = replaceMeta(html, 'name', 'twitter:title', meta.title);
  html = replaceMeta(html, 'name', 'twitter:description', meta.description);
  html = replaceMeta(html, 'name', 'twitter:image', meta.socialImage);
  html = replaceMeta(html, 'name', 'twitter:card', meta.socialImage ? 'summary_large_image' : 'summary');
  return replaceCanonical(html, meta.canonical);
}

function blogImageAlt(post) {
  const alts = {
    'urgence-dentaire-douala': 'Illustration d’un examen dentaire lié à une douleur dentaire.',
    'detartrage-et-polissage': 'Illustration d’un soin d’hygiène dentaire et de détartrage.',
    'kinesitherapie-maxillo-faciale': 'Illustration d’un exercice de mobilité maxillo-faciale.',
    'grossesse-et-sante-bucco-dentaire': 'Illustration d’une consultation en maternité au sujet de la santé bucco-dentaire.',
  };
  return alts[post.id] || `Illustration dentaire liée à l’article : ${post.title}`;
}

function renderArticleContent(content) {
  return String(content ?? '').split(/\n{2,}/).map((block) => block.trim()).filter(Boolean).map((block) => {
    const heading = block.match(/^##\s+(.+)$/);
    return heading ? `<h2>${escapeXml(heading[1])}</h2>` : `<p>${escapeXml(block).replaceAll('\n', '<br />')}</p>`;
  }).join('\n');
}

function renderBlogMarkup(route) {
  const normalizedRoute = route.replace(/\/+$/, '') || '/';
  const posts = (publicContent?.blogPosts ?? []).filter((post) => post.published && /^[a-z0-9-]+$/.test(post.slug || ''));
  if (normalizedRoute === '/blog') {
    const cards = posts.map((post) => `<article><a href="${escapeAttribute(appPath(`/blog/${post.slug}/`))}">${post.imageUrl ? `<img src="${escapeAttribute(post.imageUrl)}" alt="${escapeAttribute(blogImageAlt(post))}" loading="lazy" decoding="async" />` : ''}<h2>${escapeXml(post.title)}</h2><p>${escapeXml(post.excerpt)}</p><span>Lire l’article</span></a></article>`).join('\n');
    return `<main><h1>Conseils dentaires à ${escapeXml(publicContent?.clinic?.city || 'Douala')}</h1><p>Des informations générales sur les soins dentaires et la santé bucco-dentaire, à compléter par les conseils de votre praticien.</p>${cards || '<p>Les articles seront publiés prochainement.</p>'}</main>`;
  }
  const post = posts.find((entry) => route.replace(/\/+$/, '') === `/blog/${entry.slug}`);
  if (!post) return '';
  const image = post.imageUrl
    ? `<img src="${escapeAttribute(post.imageUrl)}" alt="${escapeAttribute(blogImageAlt(post))}" fetchpriority="high" decoding="async" />`
    : '';
  return `<main><a href="${escapeAttribute(appPath('/blog/'))}">Tous les articles</a><article><time datetime="${escapeAttribute(post.date)}">${escapeXml(post.date)} · ${escapeXml(post.author)}</time><h1>${escapeXml(post.title)}</h1><p>${escapeXml(post.excerpt)}</p>${image}<div>${renderArticleContent(post.content)}</div></article></main>`;
}

const baseTemplate = await readFile(indexPath, 'utf8');
const routesToRender = [...routes];
for (const route of routesToRender) {
  const metadata = pageMetadata(route);
  const body = route.replace(/\/+$/, '') === '/blog' || route.startsWith('/blog/')
    ? renderBlogMarkup(route)
    : `<main><h1>${escapeXml(metadata.title.split(' | ')[0])}</h1><p>${escapeXml(metadata.description)}</p></main>`;
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

if (publicContent) console.log(`Generated initial HTML snapshots for ${routesToRender.length} public routes; indexing ${canIndex ? 'enabled' : 'disabled'}.`);
