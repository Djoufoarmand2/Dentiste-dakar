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
  '/', '/soins', '/equipe', '/galerie', '/avis', '/faq', '/blog/',
  '/informations', '/contact', '/confidentialite',
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

const clinicName = publicContent?.clinic?.name?.trim() || 'Cabinet Sourire Serein';
const city = publicContent?.clinic?.city?.trim() || 'Douala';
const siteTitle = truncateMeta(viteSetting('VITE_SITE_TITLE') || `Cabinet dentaire à ${city} | ${clinicName}`, 60);
const siteDescription = truncateMeta(
  viteSetting('VITE_SITE_DESCRIPTION') || publicContent?.hero?.description || `Soins dentaires à ${city}. Contact et informations pratiques du ${clinicName}.`,
  160,
);
const configuredImageUrl = httpsImageUrl(viteSetting('VITE_SITE_OG_IMAGE_URL')) || httpsImageUrl(publicContent?.hero?.imageUrl);
const canIndex = indexable && Boolean(origin && siteTitle && siteDescription && configuredImageUrl && publicContent?.clinic);

const indexPath = path.join(outputDirectory, 'index.html');
await mkdir(outputDirectory, { recursive: true });
if (!canIndex) {
  await disableIndexing();
  console.log('Cabinet site kept noindex: set a public HTTPS URL and VITE_SITE_INDEXABLE=true after confirming the business information.');
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
  const normalizedRoute = route.replace(/\/+$/, '') || '/';
  const article = normalizedRoute.startsWith('/blog/')
    ? (publicContent?.blogPosts ?? []).find((post) => post.published && normalizedRoute === `/blog/${post.slug}`)
    : undefined;
  const titles = {
    '/soins': `Soins dentaires à ${city}`,
    '/equipe': `Équipe du cabinet dentaire à ${city}`,
    '/galerie': `Photos du cabinet dentaire à ${city}`,
    '/avis': `Avis sur le cabinet dentaire à ${city}`,
    '/faq': `Questions fréquentes sur les soins dentaires`,
    '/blog': `Conseils dentaires à ${city}`,
    '/informations': `Informations pratiques sur le cabinet`,
    '/contact': `Contact et rendez-vous à ${city}`,
    '/confidentialite': 'Politique de confidentialité',
  };
  const pageName = article?.title || (normalizedRoute === '/' ? `Cabinet dentaire à ${city}` : titles[normalizedRoute] || 'Cabinet dentaire');
  const title = seoTitle(pageName, name);
  const descriptions = {
    '/soins': `Découvrez les soins dentaires présentés par ${name} à ${city}. Contactez le cabinet pour organiser une consultation.`,
    '/equipe': `Découvrez l’équipe et les informations présentées par ${name}, cabinet dentaire à ${city}.`,
    '/galerie': `Découvrez en images les espaces et la vie du cabinet dentaire ${name} à ${city}.`,
    '/avis': `Lisez les avis publiés sur ${name}, cabinet dentaire à ${city}, et partagez votre expérience.`,
    '/faq': `Réponses aux questions fréquentes sur les soins dentaires, les rendez-vous et la première visite à ${city}.`,
    '/blog': `Articles et informations générales sur l’hygiène bucco-dentaire et les soins dentaires à ${city}.`,
    '/informations': `Retrouvez les coordonnées et les informations pratiques communiquées pour ${name} à ${city}.`,
    '/contact': `Contactez ${name}, cabinet dentaire à ${city}, pour demander des renseignements ou un rendez-vous.`,
    '/confidentialite': 'Informations sur la collecte, l’utilisation et la protection de vos données personnelles sur le site.',
  };
  const description = truncateMeta(
    article?.excerpt
      || (normalizedRoute === '/' ? publicContent?.hero?.description : undefined)
      || descriptions[normalizedRoute]
      || `${pageName} au ${name}, à ${city}. Informations et contact.`,
    160,
  );
  const socialImage = httpsImageUrl(article?.imageUrl) || httpsImageUrl(publicContent?.hero?.imageUrl) || configuredImageUrl;
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
  html = html.replace(/<\/head>/i, `${structuredDataTags(meta)}\n  </head>`);
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
    inLanguage: 'fr-CM',
  };
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': [website, dentist] })
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

function isProvisionalCopy(...values) {
  return values.some((value) => /démonstration|fictif|fictive|exemple de contenu|à remplacer|à valider|à renseigner|à confirmer/i.test(String(value ?? '')));
}

function renderServiceMarkup() {
  const services = (publicContent?.services ?? []).filter((service) =>
    service.title && service.summary && !isProvisionalCopy(service.title, service.summary));
  if (!services.length) return '<p>Les informations sur les soins seront publiées prochainement.</p>';
  return `<ul>${services.map((service) => `<li><article><h2>${escapeXml(service.title)}</h2><p>${escapeXml(service.summary)}</p></article></li>`).join('')}</ul>`;
}

function renderPublicMarkup(route, meta) {
  const clinic = publicContent?.clinic ?? {};
  const hero = publicContent?.hero ?? {};
  const cityName = clinic.city || city;
  const heading = `<h1>${escapeXml(meta.title.split(' | ')[0])}</h1>`;
  const intro = `<p>${escapeXml(meta.description)}</p>`;
  if (!publicContent) return `<main>${heading}${intro}</main>`;

  const normalizedRoute = route.replace(/\/+$/, '') || '/';
  if (normalizedRoute === '/') {
    const heroImage = httpsImageUrl(hero.imageUrl);
    return `<main><section>${hero.eyebrow ? `<p>${escapeXml(hero.eyebrow)}</p>` : ''}<h1>${escapeXml(hero.title || meta.title)}</h1><p>${escapeXml(hero.description || meta.description)}</p>${heroImage ? `<img src="${escapeAttribute(heroImage)}" alt="${escapeAttribute(hero.title || 'Cabinet dentaire à ' + cityName)}" fetchpriority="high" decoding="async" />` : ''}<p><a href="${escapeAttribute(appPath('/contact'))}">${escapeXml(hero.primaryAction || 'Contacter le cabinet')}</a></p></section><section><h2>Soins dentaires</h2>${renderServiceMarkup()}</section></main>`;
  }
  if (normalizedRoute === '/soins') {
    return `<main>${heading}${intro}${renderServiceMarkup()}</main>`;
  }
  if (normalizedRoute === '/equipe') {
    const members = (publicContent.team ?? []).filter((member) =>
      member.name && member.role && !isProvisionalCopy(member.name, member.role, member.biography));
    const items = members.map((member) => `<article><h2>${escapeXml(member.name)}</h2><p>${escapeXml(member.role)}</p>${member.biography ? `<p>${escapeXml(member.biography)}</p>` : ''}${httpsImageUrl(member.imageUrl) ? `<img src="${escapeAttribute(httpsImageUrl(member.imageUrl))}" alt="${escapeAttribute(`Portrait de ${member.name}`)}" loading="lazy" decoding="async" />` : ''}</article>`).join('');
    return `<main>${heading}${intro}${items || '<p>Les informations de l’équipe seront publiées prochainement.</p>'}</main>`;
  }
  if (normalizedRoute === '/galerie') {
    const images = (publicContent.gallery ?? []).filter((image) => httpsImageUrl(image.imageUrl) && image.alt && !isProvisionalCopy(image.alt));
    const items = images.map((image) => `<figure><img src="${escapeAttribute(httpsImageUrl(image.imageUrl))}" alt="${escapeAttribute(image.alt)}" loading="lazy" decoding="async" /><figcaption>${escapeXml(image.alt)}</figcaption></figure>`).join('');
    return `<main>${heading}${intro}${items || '<p>Les photos du cabinet seront publiées prochainement.</p>'}</main>`;
  }
  if (normalizedRoute === '/avis') {
    const reviews = (publicContent.testimonials ?? []).filter((review) =>
      review.quote && !isProvisionalCopy(review.name, review.quote, review.service));
    const items = reviews.map((review) => `<article><h2>${escapeXml(review.name || 'Avis de patient')}</h2>${review.service ? `<p>${escapeXml(review.service)}</p>` : ''}<blockquote>${escapeXml(review.quote)}</blockquote></article>`).join('');
    return `<main>${heading}${intro}${items || '<p>Les avis seront affichés après leur validation.</p>'}</main>`;
  }
  if (normalizedRoute === '/faq') {
    const faqs = (publicContent.faqs ?? []).filter((faq) =>
      faq.question && faq.answer && !isProvisionalCopy(faq.question, faq.answer));
    const items = faqs.map((faq) => `<details><summary>${escapeXml(faq.question)}</summary><p>${escapeXml(faq.answer)}</p></details>`).join('');
    return `<main>${heading}${intro}${items || '<p>Les réponses aux questions fréquentes seront publiées prochainement.</p>'}</main>`;
  }
  if (normalizedRoute === '/informations' || normalizedRoute === '/contact') {
    const rows = [
      clinic.address ? `<p><strong>Adresse :</strong> ${escapeXml(clinic.address)}</p>` : '',
      clinic.phone ? `<p><strong>Téléphone :</strong> <a href="tel:${escapeAttribute(clinic.phone)}">${escapeXml(clinic.phone)}</a></p>` : '',
      clinic.email ? `<p><strong>Courriel :</strong> <a href="mailto:${escapeAttribute(clinic.email)}">${escapeXml(clinic.email)}</a></p>` : '',
      clinic.openingHours ? `<p><strong>Horaires :</strong> ${escapeXml(clinic.openingHours)}</p>` : '',
    ].filter(Boolean).join('');
    return `<main>${heading}${intro}${rows || `<p>Contactez le cabinet dentaire à ${escapeXml(cityName)} pour obtenir ses coordonnées et horaires.</p>`}</main>`;
  }
  return `<main>${heading}${intro}</main>`;
}

const baseTemplate = await readFile(indexPath, 'utf8');
const routesToRender = [...routes];
for (const route of routesToRender) {
  const metadata = pageMetadata(route);
  const body = route.replace(/\/+$/, '') === '/blog' || route.startsWith('/blog/')
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
