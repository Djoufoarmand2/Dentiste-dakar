import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { createClient } from '@supabase/supabase-js';

// Reproducible publication of the media already uploaded and verified in Supabase.
// Do not rerun the broad clinic seed: this changes only hero.imageUrl.
const metadata = JSON.parse(await readFile(new URL('../../artifacts/cabinet-dentaire/src/lib/hero-illustration.json', import.meta.url), 'utf8'));
const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) throw new Error('Required Supabase configuration is missing.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const imageUrl = `${url}/storage/v1/object/public/cabinet-media/${metadata.storagePath}`;
const { data: media, error: mediaError } = await db.from('cabinet_media')
  .select('status,public_url,size').eq('path', metadata.storagePath).single();
if (mediaError || media.status !== 'ready' || media.public_url !== imageUrl) throw new Error('Hero media is not registered and ready.');
const image = await fetch(imageUrl, { method: 'HEAD' });
if (!image.ok || image.headers.get('content-type') !== 'image/jpeg' || Number(image.headers.get('content-length')) !== Number(media.size)) throw new Error('Hero media is not publicly readable or its metadata differs.');
const { data: row, error: readError } = await db.from('cabinet_site_content').select('content,version').eq('id', true).single();
if (readError || !row?.content) throw new Error('Published CMS content cannot be read.');
if (!row.content.gallery.some((item) => item.id === 'photo-clinique-la-bienveillance' && item.imageUrl)) throw new Error('The official facade must remain in the gallery.');

if (row.content.hero.imageUrl !== imageUrl) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error('Administrator configuration is missing.');
  let actor;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error('Administrator verification failed.');
    const user = data.users.find((entry) => entry.email?.trim().toLowerCase() === email);
    if (user) {
      if (!user.email_confirmed_at) throw new Error('Administrator email is not confirmed.');
      const { data: allowed, error: claimError } = await db.rpc('cabinet_claim_admin', { p_user_id: user.id });
      if (claimError || allowed !== true) throw new Error('Administrator is not authorized.');
      actor = user.id;
      break;
    }
    if (data.users.length < 1000) break;
  }
  if (!actor) throw new Error('Configured administrator not found.');
  const backup = `backups/site-content-before-dentist-hero-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const { error: backupError } = await db.storage.from('cabinet-site-content').upload(backup, JSON.stringify(row), { contentType: 'application/json', upsert: false });
  if (backupError) throw new Error('Private backup failed; publication aborted.');
  const content = structuredClone(row.content);
  content.hero.imageUrl = imageUrl;
  const { error: publishError } = await db.rpc('cabinet_publish', { p_actor: actor, p_expected_version: row.version, p_content: content });
  if (publishError) throw new Error('CMS publication failed; previous version remains active.');
}

const response = await fetch(`${url}/functions/v1/cabinet-api/site-content`, { headers: { apikey: key } });
const published = await response.json();
if (!response.ok || published.hero?.imageUrl !== imageUrl) throw new Error('The public API is not serving the dentist hero.');
const { data: finalRow, error: finalError } = await db.from('cabinet_site_content').select('content').eq('id', true).single();
if (finalError || !finalRow?.content) throw new Error('Final published content cannot be verified.');
const previousWithoutHeroImage = structuredClone(row.content);
const publishedWithoutHeroImage = structuredClone(finalRow.content);
delete previousWithoutHeroImage.hero.imageUrl;
delete publishedWithoutHeroImage.hero.imageUrl;
if (!isDeepStrictEqual(previousWithoutHeroImage, publishedWithoutHeroImage)) throw new Error('Unexpected changes outside the hero image.');
console.log(JSON.stringify({ heroPublished: true, imageStatus: image.status, facadePreserved: true, otherClinicContentPreserved: true }));
