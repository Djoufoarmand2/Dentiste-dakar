import { isDeepStrictEqual } from 'node:util';
import { createClient } from '@supabase/supabase-js';

const apply = process.argv.includes('--apply');
const unknownArguments = process.argv.slice(2).filter((argument) => argument !== '--apply');
if (unknownArguments.length) throw new Error('Only --apply is supported.');

const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const expectedAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
if (!supabaseUrl || !serviceRoleKey || !expectedAdminEmail) {
  throw new Error('Supabase CMS migration configuration is incomplete.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function replaceCopy(value) {
  const partnerNames = [];
  let text = value.replace(/Clinique La Bienveillance/gi, (name) => {
    const index = partnerNames.push(name) - 1;
    return `\uE000${index}\uE001`;
  });

  const replacements = [
    [/Contactez directement la clinique/g, 'Contactez directement l’établissement partenaire'],
    [/contactez directement la clinique/g, 'contactez directement l’établissement partenaire'],
    [/à la clinique partenaire/gi, 'au sein de l’établissement partenaire'],
    [/de la clinique partenaire/gi, 'de l’établissement partenaire'],
    [/La clinique partenaire/g, 'L’établissement partenaire'],
    [/la clinique partenaire/g, 'l’établissement partenaire'],
    [/à la Clinique Sourire Serein/g, 'au Cabinet Sourire Serein'],
    [/de la Clinique Sourire Serein/g, 'du Cabinet Sourire Serein'],
    [/La Clinique Sourire Serein/g, 'Le Cabinet Sourire Serein'],
    [/la Clinique Sourire Serein/g, 'le Cabinet Sourire Serein'],
    [/Clinique Sourire Serein/gi, 'Cabinet Sourire Serein'],
    [/Contactez la clinique/g, 'Contactez le cabinet'],
    [/contactez la clinique/g, 'contactez le cabinet'],
    [/Contacter la clinique/g, 'Contacter le cabinet'],
    [/contacter la clinique/g, 'contacter le cabinet'],
    [/à la clinique/gi, 'au cabinet'],
    [/de la clinique/gi, 'du cabinet'],
    [/La clinique/g, 'Le cabinet'],
    [/la clinique/g, 'le cabinet'],
  ];
  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return text.replace(/\uE000(\d+)\uE001/g, (_token, index) => partnerNames[Number(index)]);
}

function visitCopy(value, path = '$', changes = []) {
  if (typeof value === 'string') {
    const key = path.split('.').at(-1);
    if (['id', 'slug', 'email', 'mapUrl', 'imageUrl', 'videoUrl'].includes(key)) return value;
    if (key === 'bookingUrl') {
      try {
        const url = new URL(value);
        const message = url.searchParams.get('text');
        if (!message) return value;
        const updatedMessage = replaceCopy(message);
        if (updatedMessage !== message) changes.push(path);
        url.searchParams.set('text', updatedMessage);
        return url.toString();
      } catch {
        return value;
      }
    }
    const updated = replaceCopy(value);
    if (updated !== value) changes.push(path);
    return updated;
  }
  if (Array.isArray(value)) return value.map((item, index) => visitCopy(item, `${path}[${index}]`, changes));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      visitCopy(item, `${path}.${key}`, changes),
    ]));
  }
  return value;
}

function findConfiguredAdmin() {
  return (async () => {
    for (let page = 1; page <= 20; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error('Administrator verification failed.');
      const admin = data.users.find((user) => user.email?.trim().toLowerCase() === expectedAdminEmail);
      if (admin) {
        if (!admin.email_confirmed_at) throw new Error('The configured administrator is not confirmed.');
        const { data: claimed, error: claimError } = await supabase.rpc('cabinet_claim_admin', { p_user_id: admin.id });
        if (claimError || claimed !== true) throw new Error('The configured account is not authorized to publish.');
        return admin.id;
      }
      if (data.users.length < 1000) break;
    }
    throw new Error('Configured administrator was not found.');
  })();
}

const { data: row, error: readError } = await supabase
  .from('cabinet_site_content')
  .select('content,version')
  .eq('id', true)
  .single();
if (readError || !row?.content || !Number.isInteger(row.version)) {
  throw new Error('Published CMS content could not be read.');
}

const before = structuredClone(row.content);
const changes = [];
const content = visitCopy(before, '$', changes);
const remainingTerms = [];
function findRemaining(value, path = '$') {
  if (typeof value === 'string') {
    const key = path.split('.').at(-1);
    if (['id', 'slug', 'email', 'mapUrl', 'imageUrl', 'videoUrl'].includes(key)) return;
    const withoutPartnerName = value.replace(/Clinique La Bienveillance/gi, '');
    if (/\b(?:la|de la|à la)\s+clinique\b|\bClinique Sourire Serein\b|\bclinique partenaire\b/i.test(withoutPartnerName)) {
      remainingTerms.push(path);
    }
  } else if (Array.isArray(value)) value.forEach((item, index) => findRemaining(item, `${path}[${index}]`));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => findRemaining(item, `${path}.${key}`));
}
findRemaining(content);
if (remainingTerms.length) throw new Error(`Unconverted CMS copy remains at: ${remainingTerms.join(', ')}`);
if (isDeepStrictEqual(before, content)) {
  console.log(JSON.stringify({ changed: false, version: row.version }));
} else if (!apply) {
  console.log(JSON.stringify({ dryRun: true, currentVersion: row.version, changedFields: [...new Set(changes)] }, null, 2));
} else {
  const actor = await findConfiguredAdmin();
  const backupPath = `backups/site-content-before-cabinet-wording-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const { error: backupError } = await supabase.storage.from('cabinet-site-content').upload(
    backupPath,
    JSON.stringify({ backedUpAt: new Date().toISOString(), version: row.version, content: before }),
    { contentType: 'application/json', cacheControl: '3600', upsert: false },
  );
  if (backupError) throw new Error('Private CMS backup failed; publication was aborted.');

  const { error: publishError } = await supabase.rpc('cabinet_publish', {
    p_actor: actor,
    p_expected_version: row.version,
    p_content: content,
  });
  if (publishError) throw new Error('CMS publication failed; the previous version remains active.');

  const { data: finalRow, error: finalError } = await supabase
    .from('cabinet_site_content')
    .select('content,version')
    .eq('id', true)
    .single();
  if (finalError || !finalRow?.content || !isDeepStrictEqual(finalRow.content, content)) {
    throw new Error('Published CMS content could not be verified.');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/cabinet-api/site-content`, {
    headers: { apikey: serviceRoleKey },
  });
  const publicContent = await response.json().catch(() => null);
  if (!response.ok || !isDeepStrictEqual(publicContent, content)) {
    throw new Error('The public site API is not serving the updated CMS content.');
  }
  console.log(JSON.stringify({
    changed: true,
    previousVersion: row.version,
    publishedVersion: finalRow.version,
    changedFieldCount: [...new Set(changes)].length,
    backupPath,
    partnerNamePreserved: true,
  }));
}
