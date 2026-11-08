import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { createClient } from '@supabase/supabase-js';

const officialFaqs = JSON.parse(await readFile(
  new URL('../../artifacts/cabinet-dentaire/src/data/clinic-faqs.json', import.meta.url),
  'utf8',
));
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_EMAIL'];
for (const key of required) {
  if (!process.env[key]?.trim()) throw new Error(`Missing required environment variable: ${key}`);
}
if (process.env.CONFIRM_CABINET_FAQ_PUBLISH !== 'YES') {
  throw new Error('Refusing to publish without explicit confirmation via CONFIRM_CABINET_FAQ_PUBLISH=YES.');
}

const supabaseUrl = process.env.SUPABASE_URL.trim().replace(/\/+$/, '');
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const officialIds = new Set(officialFaqs.map((faq) => faq.id));
const refreshCopyIds = new Set(['faq-rendez-vous-officiel', 'faq-horaires-officiels']);

async function findConfiguredAdmin() {
  const expectedEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error('Could not verify the configured administrator.');
    const user = data.users.find((entry) => entry.email?.trim().toLowerCase() === expectedEmail);
    if (user) {
      if (!user.email_confirmed_at) throw new Error('Administrator email is not confirmed.');
      const { data: allowed, error: claimError } = await supabase.rpc('cabinet_claim_admin', { p_user_id: user.id });
      if (claimError || allowed !== true) throw new Error('Configured account is not authorized to publish clinic content.');
      return user.id;
    }
    if (data.users.length < 1000) break;
  }
  throw new Error('Configured administrator was not found.');
}

const { data: currentRow, error: readError } = await supabase
  .from('cabinet_site_content')
  .select('content,version')
  .eq('id', true)
  .single();
if (readError || !currentRow?.content || !Number.isInteger(currentRow.version)) {
  throw new Error('Could not read the current site content and version.');
}

const previousFaqs = Array.isArray(currentRow.content.faqs) ? currentRow.content.faqs : [];
const previousById = new Map(previousFaqs.map((faq) => [faq.id, faq]));
const nextFaqs = [
  ...officialFaqs.map((faq) => {
    const existing = previousById.get(faq.id);
    if (!existing || refreshCopyIds.has(faq.id)) return faq;
    return existing;
  }),
  ...previousFaqs.filter((faq) => !officialIds.has(faq.id)),
];
const nextContent = { ...structuredClone(currentRow.content), faqs: nextFaqs };

if (!isDeepStrictEqual(currentRow.content, nextContent)) {
  const actor = await findConfiguredAdmin();
  const backupPath = `backups/site-content-before-faq-update-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const { error: backupError } = await supabase.storage.from('cabinet-site-content').upload(
    backupPath,
    JSON.stringify({ backedUpAt: new Date().toISOString(), version: currentRow.version, content: currentRow.content }),
    { contentType: 'application/json', cacheControl: '3600', upsert: false },
  );
  if (backupError) throw new Error('Private CMS backup failed; no content was changed.');

  const { error: publishError } = await supabase.rpc('cabinet_publish', {
    p_actor: actor,
    p_expected_version: currentRow.version,
    p_content: nextContent,
  });
  if (publishError) throw new Error('FAQ publication failed; the previous content remains active.');

  const { data: finalRow, error: finalError } = await supabase
    .from('cabinet_site_content')
    .select('content')
    .eq('id', true)
    .single();
  if (finalError || !finalRow?.content) throw new Error('Could not verify the published FAQ content.');
  const originalWithoutFaqs = structuredClone(currentRow.content);
  const finalWithoutFaqs = structuredClone(finalRow.content);
  delete originalWithoutFaqs.faqs;
  delete finalWithoutFaqs.faqs;
  if (!isDeepStrictEqual(originalWithoutFaqs, finalWithoutFaqs)) {
    throw new Error('Unexpected content changed outside the FAQ section.');
  }
  const finalFaqsById = new Map((finalRow.content.faqs ?? []).map((faq) => [faq.id, faq]));
  if (
    finalRow.content.faqs?.length !== nextFaqs.length
    || !nextFaqs.every((faq) => isDeepStrictEqual(finalFaqsById.get(faq.id), faq))
  ) {
    throw new Error('The database FAQ round-trip did not match the requested content.');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/cabinet-api/site-content`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY },
  });
  const publicContent = await response.json();
  const publicFaqsById = new Map((publicContent?.faqs ?? []).map((faq) => [faq.id, faq]));
  if (
    !response.ok
    || publicContent?.faqs?.length !== nextFaqs.length
    || !nextFaqs.every((faq) => isDeepStrictEqual(publicFaqsById.get(faq.id), faq))
  ) {
    throw new Error('The public API is not serving the new FAQ content.');
  }

  console.log(JSON.stringify({
    result: 'published',
    faqCount: finalRow.content.faqs.length,
    backup: backupPath,
    unchangedOutsideFaqs: true,
    publicApiVerified: true,
  }));
} else {
  const response = await fetch(`${supabaseUrl}/functions/v1/cabinet-api/site-content`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY },
  });
  const publicContent = await response.json().catch(() => null);
  const publicFaqsById = new Map((publicContent?.faqs ?? []).map((faq) => [faq.id, faq]));
  if (
    !response.ok
    || publicContent?.faqs?.length !== nextFaqs.length
    || !nextFaqs.every((faq) => isDeepStrictEqual(publicFaqsById.get(faq.id), faq))
  ) {
    throw new Error('The public API is not serving the current FAQ content.');
  }
  console.log(JSON.stringify({ result: 'already-current', faqCount: previousFaqs.length, publicApiVerified: true }));
}
