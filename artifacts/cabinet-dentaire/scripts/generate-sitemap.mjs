import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDirectory = process.env.CABINET_SITEMAP_OUTPUT_DIR
  ? path.resolve(process.env.CABINET_SITEMAP_OUTPUT_DIR)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/public');
const sitemapPath = path.join(outputDirectory, 'sitemap.xml');
const robotsPath = path.join(outputDirectory, 'robots.txt');

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
const title = process.env.VITE_SITE_TITLE?.trim();
const description = process.env.VITE_SITE_DESCRIPTION?.trim();
const imageUrl = process.env.VITE_SITE_OG_IMAGE_URL?.trim();
let validImage = false;
try {
  const parsedImage = new URL(imageUrl || '');
  validImage = parsedImage.protocol === 'https:';
} catch {
  validImage = false;
}

if (!indexable || !origin || !title || !description || !validImage) {
  await disableIndexing();
  console.log('Cabinet site kept noindex: official URL, title, description and HTTPS sharing image must all be configured to enable indexing.');
  process.exit(0);
}

const fixedRoutes = [
  '/', '/soins', '/equipe', '/galerie', '/avis', '/faq', '/blog',
  '/informations', '/contact', '/confidentialite',
];
const routes = new Set(fixedRoutes);

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
if (supabaseUrl && publishableKey) {
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/cabinet-api/site-content`, {
      headers: { apikey: publishableKey },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const content = await response.json();
      for (const post of content.blogPosts ?? []) {
        if (post?.published === true && typeof post.slug === 'string' && /^[a-z0-9-]+$/.test(post.slug)) {
          routes.add(`/blog/${post.slug}`);
        }
      }
    } else {
      console.warn(`Published blog routes were not included in the sitemap (HTTP ${response.status}).`);
    }
  } catch {
    console.warn('Published blog routes could not be loaded; static public routes will still be listed.');
  }
}

const urls = [...routes].map((route) => `${origin}${route === '/' ? '/' : route}`);
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`),
  '</urlset>',
  '',
].join('\n');

await mkdir(outputDirectory, { recursive: true });
await writeFile(sitemapPath, xml);

const indexPath = path.join(outputDirectory, 'index.html');
let html = await readFile(indexPath, 'utf8');
html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeXml(title)}</title>`);
html = html.replace(/(<meta name="description" content=")[^"]*("\s*\/?>)/i, `$1${escapeXml(description)}$2`);
html = html.replace(/<meta name="robots" content="[^"]*"\s*\/?>/i, '<meta name="robots" content="index, follow" />');
html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapeXml(title)}" />`);
html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapeXml(description)}" />`);
html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${escapeXml(title)}" />`);
html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${escapeXml(description)}" />`);
html = html.replace(/<meta property="og:url"[^>]*\/?>/i, '');
html = html.replace(/<link rel="canonical"[^>]*\/?>/i, '');
html = html.replace(/<\/head>/i, `    <meta property="og:image" content="${escapeXml(imageUrl)}" />\n    <meta name="twitter:image" content="${escapeXml(imageUrl)}" />\n  </head>`);
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
