import { isDeepStrictEqual } from 'node:util';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
if (!url || !key || !adminEmail) throw new Error('Required Supabase configuration is missing.');

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const imageForPost = new Map([
  ['urgence-dentaire-douala', 'illustration-traitement-caries'],
  ['detartrage-et-polissage', 'illustration-detartrage-polissage'],
  ['kinesitherapie-maxillo-faciale', 'illustration-kinesitherapie-maxillo-faciale'],
  ['grossesse-et-sante-bucco-dentaire', 'illustration-maternite-clinique-bienveillance'],
]);

let actor;
for (let page = 1; page <= 20; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error('Administrator verification failed.');
  const admin = data.users.find((user) => user.email?.trim().toLowerCase() === adminEmail);
  if (admin) {
    if (!admin.email_confirmed_at) throw new Error('Configured administrator is not confirmed.');
    const { data: allowed, error: claimError } = await db.rpc('cabinet_claim_admin', { p_user_id: admin.id });
    if (claimError || allowed !== true) throw new Error('Configured user is not authorized to publish clinic content.');
    actor = admin.id;
    break;
  }
  if (data.users.length < 1000) break;
}
if (!actor) throw new Error('Configured administrator was not found.');

const { data: row, error: readError } = await db.from('cabinet_site_content').select('content,version').eq('id', true).single();
if (readError || !row?.content) throw new Error('Could not read the published CMS content.');
const content = structuredClone(row.content);
const original = structuredClone(row.content);
const gallery = new Map(content.gallery.map((item) => [item.id, item]));

for (const post of content.blogPosts) {
  const imageId = imageForPost.get(post.id);
  if (!post.published || !imageId) continue;
  const media = gallery.get(imageId);
  if (!media?.imageUrl?.startsWith('https://')) throw new Error(`Missing HTTPS illustration for published article ${post.id}.`);
  const { data: registration, error: mediaError } = await db.from('cabinet_media')
    .select('path,public_url,mime_type,size,status').eq('public_url', media.imageUrl).single();
  if (mediaError || registration.status !== 'ready' || registration.mime_type !== 'image/jpeg') {
    throw new Error(`Illustration ${imageId} is not registered as ready JPEG media.`);
  }
  const stored = await fetch(media.imageUrl, { method: 'HEAD' });
  if (!stored.ok || Number(stored.headers.get('content-length')) !== Number(registration.size)) {
    throw new Error(`Illustration ${imageId} failed public storage verification.`);
  }
  post.imageUrl = media.imageUrl;
}

const expectedIds = [...imageForPost.keys()];
if (!expectedIds.every((id) => content.blogPosts.some((post) => post.id === id && post.published && post.imageUrl))) {
  throw new Error('All four expected published blog articles must be updated.');
}
const beforeImages = structuredClone(original);
const afterImages = structuredClone(content);
for (const document of [beforeImages, afterImages]) {
  for (const post of document.blogPosts) if (imageForPost.has(post.id)) delete post.imageUrl;
}
if (!isDeepStrictEqual(beforeImages, afterImages)) throw new Error('CMS fields other than the four blog images changed.');

const hasChanges = content.blogPosts.some((post) => post.imageUrl !== original.blogPosts.find((entry) => entry.id === post.id)?.imageUrl);
if (hasChanges) {
  const backupPath = `backups/site-content-before-blog-images-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const { error: backupError } = await db.storage.from('cabinet-site-content').upload(
    backupPath,
    JSON.stringify({ version: row.version, content: row.content }),
    { contentType: 'application/json', cacheControl: '3600', upsert: false },
  );
  if (backupError) throw new Error('Private CMS backup failed; publication aborted.');

  const { error: publishError } = await db.rpc('cabinet_publish', {
    p_actor: actor,
    p_expected_version: row.version,
    p_content: content,
  });
  if (publishError) throw new Error('Blog image publication failed.');
}

const response = await fetch(`${url}/functions/v1/cabinet-api/site-content`, { headers: { apikey: key } });
if (!response.ok) throw new Error('Public CMS verification failed.');
const published = await response.json();
const publishedArticles = expectedIds.map((id) => published.blogPosts.find((post) => post.id === id));
if (publishedArticles.some((post) => !post?.published || !post.imageUrl)) throw new Error('Published blog image URLs are missing.');
const facadeBefore = original.gallery.find((item) => item.id === 'photo-clinique-la-bienveillance')?.imageUrl;
const facadeAfter = published.gallery.find((item) => item.id === 'photo-clinique-la-bienveillance')?.imageUrl;
if (facadeBefore !== facadeAfter) throw new Error('The partner-clinic facade changed unexpectedly.');
const { data: finalRow, error: finalReadError } = await db.from('cabinet_site_content').select('content').eq('id', true).single();
if (finalReadError || !finalRow?.content) throw new Error('Could not verify the saved CMS document.');
const beforeDocument = structuredClone(original);
const afterDocument = structuredClone(finalRow.content);
for (const document of [beforeDocument, afterDocument]) {
  for (const post of document.blogPosts) if (imageForPost.has(post.id)) delete post.imageUrl;
}
if (!isDeepStrictEqual(beforeDocument, afterDocument)) throw new Error('Unexpected CMS changes outside the four blog images.');
console.log(JSON.stringify({ publishedArticles: publishedArticles.length, allImagesHttps: publishedArticles.every((post) => post.imageUrl.startsWith('https://')), otherContentPreserved: true, changed: hasChanges }));
