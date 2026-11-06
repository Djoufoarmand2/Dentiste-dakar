// Run with: pnpm --filter @workspace/scripts exec tsx src/audit-cabinet-content.mjs [--apply]
// Credentials stay in process memory; only aggregate results are printed.
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { verifiedAdminSession } from './check-cabinet-supabase.mjs';
import { fillEnglishFieldsForAdmin, fillEnglishFieldsForBlogAdmin, fillEnglishFieldsForFaqAdmin } from '../../artifacts/cabinet-dentaire/src/lib/cms-translations.ts';
import { defaultPrivacyPolicyContent, defaultWhyChooseContent } from '../../artifacts/cabinet-dentaire/src/lib/site-page-defaults.ts';

const url = process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.ADMIN_EMAIL) throw new Error('Configuration missing');
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: before, error } = await db.from('cabinet_site_content').select('content,version').eq('id', true).single();
if (error) throw new Error('Unable to read CMS content');
const content = structuredClone(before.content);
const fill = (target, values) => {
  for (const [field, value] of Object.entries(values)) if (!target[field]?.trim?.() && value) target[field] = value;
};
fill(content.clinic, { openingHoursEn: '24 hours a day · 7 days a week' });
fill(content.hero, {
  eyebrowEn: 'Dental practice in Douala',
  titleEn: 'Attentive dental care in the heart of Douala.',
  descriptionEn: 'Cabinet Sourire Serein welcomes you at Clinique La Bienveillance for dental consultations and care.',
  primaryActionEn: 'Request an appointment', secondaryActionEn: 'Explore our services',
});
content.services = content.services.map(fillEnglishFieldsForAdmin);
content.blogPosts = content.blogPosts.map(fillEnglishFieldsForBlogAdmin);
content.faqs = content.faqs.map(fillEnglishFieldsForFaqAdmin);
const galleryAlt = {
  'photo-clinique-la-bienveillance': 'Exterior of Clinique La Bienveillance in Douala',
  'partner-clinique-la-bienveillance-logo': 'Official logo of partner institution Clinique La Bienveillance',
  'illustration-consultation-dentaire': 'AI-generated illustration: dental consultation with a patient.',
  'illustration-detartrage-polissage': 'AI-generated illustration: dental hygiene care.',
  'illustration-traitement-caries': 'AI-generated illustration: dental examination.',
  'illustration-plombage-composite': 'AI-generated illustration: discussing a dental restoration.',
  'illustration-kinesitherapie-maxillo-faciale': 'AI-generated illustration: jaw mobility exercise.',
  'illustration-laboratoire-prothetique': 'AI-generated illustration: creating a dental prosthesis.',
  'illustration-chirurgie-dentaire': 'AI-generated illustration: preparing a dental surgery room.',
  'illustration-maternite-clinique-bienveillance': 'AI-generated illustration: maternity consultation at the partner institution.',
};
for (const image of content.gallery) fill(image, { altEn: galleryAlt[image.id] });
const campaigns = {
  'campaigns-mw37yt9m': { titleEn: 'A first visit to the dentist (French video)', descriptionEn: 'An educational video in French explaining a first visit to the dentist.' },
  'campaigns-mw39583p': { titleEn: 'The dentist | Educational song for children | HeyKids (French)', descriptionEn: 'An educational song in French for children and toddlers.' },
};
for (const campaign of content.campaigns) fill(campaign, campaigns[campaign.id] || {});
content.whyChoose ||= structuredClone(defaultWhyChooseContent);
content.privacyPolicy ||= structuredClone(defaultPrivacyPolicyContent);

const gaps = [];
const pairs = {
  clinic: ['openingHours'], hero: ['eyebrow', 'title', 'description', 'primaryAction', 'secondaryAction'],
  services: ['title', 'slug', 'summary', 'description', 'purpose', 'procedureSteps', 'imageAlt'],
  blogPosts: ['title', 'slug', 'excerpt', 'content', 'author', 'imageAlt'],
  faqs: ['question', 'answer'], gallery: ['alt'], team: ['role', 'biography'],
  testimonials: ['service', 'quote'], campaigns: ['title', 'description', 'transcript'],
  whyChoose: ['eyebrow', 'title', 'intro', 'valuesEyebrow', 'valuesTitle', 'partnerEyebrow', 'partnerTitle', 'partnerBody'],
  privacyPolicy: ['eyebrow', 'title', 'description', 'contactTitle', 'contactIntro'],
};
const check = (section, item, fields) => {
  for (const field of fields) if (item[field]?.trim?.() && !item[`${field}En`]?.trim?.()) gaps.push({ section, id: item.id || section, field });
};
for (const [section, fields] of Object.entries(pairs)) for (const item of Array.isArray(content[section]) ? content[section] : [content[section]]) if (item) check(section, item, fields);
for (const item of content.whyChoose.values) check('whyChoose', item, ['title', 'body']);
for (const item of content.privacyPolicy.sections) check('privacyPolicy', item, ['title', 'body']);
console.log(JSON.stringify({ version: before.version, translationGaps: gaps, changed: JSON.stringify(content) !== JSON.stringify(before.content), apply: process.argv.includes('--apply') }));
if (gaps.length) throw new Error('Translation gaps remain; nothing was published.');
if (!process.argv.includes('--apply') || JSON.stringify(content) === JSON.stringify(before.content)) process.exit(0);

// Back up public CMS content before the optimistic, authenticated publication.
const directory = new URL('../../generated-artifacts/site-audit/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL(`content-${randomUUID()}.json`, directory), JSON.stringify(before), { mode: 0o600 });
const session = await verifiedAdminSession();
if (!session) throw new Error('An existing, confirmed administrator is required');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const restored = await client.auth.setSession(session);
if (restored.error) throw new Error('Unable to restore verified administrator session');
const token = session.access_token;
try {
  const response = await fetch(`${url}/functions/v1/cabinet-api/admin/site-content`, {
    method: 'PUT',
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, expectedVersion: before.version }),
  });
  if (!response.ok) throw new Error(`Publication failed (${response.status}); no retry with a newer version.`);
  const saved = await response.json();
  if (!isDeepStrictEqual(saved.content, content)) throw new Error('The API did not preserve the complete content. Verify the deployed schema before continuing.');
  console.log(JSON.stringify({ published: true, version: saved.version, translationGaps: 0 }));
} finally {
  await client.auth.signOut({ scope: 'local' });
}
