import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cfg = JSON.parse(await readFile(resolve(root, 'generated-artifacts/cabinet-public-config.json'), 'utf8'));
const url = cfg.VITE_SUPABASE_URL;
const key = cfg.VITE_SUPABASE_PUBLISHABLE_KEY;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
let passed = 0;
function check(ok, label) { assert.ok(ok, label); passed++; console.info(`PASS ${label}`); }
async function call(path, { token, method = 'GET', body, from = origin } = {}) {
  const headers = { apikey: key };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (from) headers.Origin = from;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${url}/functions/v1/cabinet-api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = response.status === 204 ? null : await response.json();
  return { status: response.status, data, headers: response.headers };
}

export async function verifiedAdminSession() {
  const { data, error } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error('Administrator lookup failed.');
  const admin = data.users.find((u) => u.email?.toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase());
  if (!admin?.email_confirmed_at) return null;
  const link = await service.auth.admin.generateLink({ type: 'magiclink', email: admin.email });
  if (link.error) throw new Error('Unable to prepare verified administrator session.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const session = await client.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: 'magiclink' });
  if (session.error || !session.data.session) throw new Error('Unable to verify administrator session.');
  return session.data.session;
}

async function run() {
  const publicResult = await call('/site-content');
  check(publicResult.status === 200 && !!publicResult.data.clinic, 'Public Supabase content loads');
  check(publicResult.data.blogPosts.every((p) => p.published) && publicResult.data.campaigns.every((p) => p.active), 'Public response contains published content only');
  check(publicResult.headers.get('access-control-allow-origin') === origin, 'Explicit frontend CORS allowed');
  check((await call('/site-content', { from: 'https://untrusted.invalid' })).status === 403, 'Untrusted origin rejected');
  check((await call('/admin/access')).status === 401, 'Anonymous administrator check rejected');
  check((await call('/admin/site-content', { method: 'PUT', body: {} })).status === 401, 'Anonymous publication rejected');
  const forged = `${Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')}.${Buffer.from(JSON.stringify({ role: 'service_role', exp: 1 })).toString('base64url')}.invalid`;
  check((await call('/admin/access', { token: forged })).status === 401, 'Forged or expired JWT rejected');
  const anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  check(!!(await anon.from('cabinet_site_content').select('*')).error, 'Anonymous direct table read denied');
  check(!!(await anon.from('cabinet_site_content').update({ version: 999 }).eq('id', true)).error, 'Anonymous direct table update denied');
  check(!!(await anon.rpc('cabinet_claim_admin', { p_user_id: randomUUID() })).error, 'Anonymous administrator claim RPC denied');

  const password = randomBytes(28).toString('base64url');
  const email = `cabinet-check-${randomUUID()}@example.invalid`;
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: 'admin', isAdmin: true } });
  if (created.error) throw new Error('Unable to create isolated authorization fixture.');
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const signin = await client.auth.signInWithPassword({ email, password });
    if (signin.error) throw new Error('Fixture sign-in failed.');
    const token = signin.data.session.access_token;
    check((await call('/admin/access', { token })).data.isAdmin === false, 'User-controlled role metadata grants no admin access');
    for (const [path, method, body] of [
      ['/admin/site-content', 'GET', undefined], ['/admin/site-content', 'PUT', {}],
      ['/admin/media', 'GET', undefined], ['/admin/media/prepare', 'POST', {}], ['/admin/media/delete', 'POST', {}],
    ]) check((await call(path, { token, method, body })).status === 403, `Ordinary account denied ${method} ${path}`);
    const read = await client.from('cabinet_site_content').select('*');
    check(!read.error && read.data.length === 0, 'Ordinary account cannot read full content directly');
    check(!!(await client.from('cabinet_admins').insert({ id: true, user_id: created.data.user.id })).error, 'Ordinary account cannot grant itself a role');
    check(!!(await client.storage.from('cabinet-media').upload(`uploads/${randomUUID()}.png`, new Uint8Array([1]), { contentType: 'image/png' })).error, 'Ordinary account direct Storage upload denied');
    await client.auth.signOut();
  } finally {
    const removed = await service.auth.admin.deleteUser(created.data.user.id);
    check(!removed.error, 'Authorization fixture cleaned up');
  }
  const admin = await verifiedAdminSession();
  if (!admin) {
    console.info(JSON.stringify({ passed, adminChecks: 'blocked_pending_email_verification' }));
    return;
  }
  const token = admin.access_token;
  const access = await call('/admin/access', { token });
  check(access.status === 200 && access.data.isAdmin === true, 'Verified administrator securely bound');
  const document = await call('/admin/site-content', { token });
  check(document.status === 200 && Number.isInteger(document.data.version), 'Administrator full document and version load');
  const original = structuredClone(document.data.content);
  let changed = false;
  let asset;
  try {
    const edited = structuredClone(original);
    edited.blogPosts.push({ id: `check-${randomUUID()}`, slug: `check-${randomUUID()}`, title: 'Brouillon technique temporaire', excerpt: '', content: 'Ne doit jamais apparaître publiquement.', imageUrl: '', author: 'Vérification', date: '2026-10-28', published: false });
    const publish = await call('/admin/site-content', { token, method: 'PUT', body: { content: edited, expectedVersion: document.data.version } });
    check(publish.status === 200, 'Administrator atomic publication succeeds');
    changed = true;
    const publicAfter = await call('/site-content');
    check(!publicAfter.data.blogPosts.some((p) => p.id === edited.blogPosts.at(-1).id), 'Unpublished article excluded on the server');
    check((await call('/admin/site-content', { token, method: 'PUT', body: { content: edited, expectedVersion: document.data.version } })).status === 409, 'Stale publication version rejected');
    check((await call('/admin/site-content', { token, method: 'PUT', body: { content: {}, expectedVersion: publish.data.version } })).status === 400, 'Invalid content rejected');
    const unsafe = structuredClone(edited); unsafe.hero.imageUrl = 'javascript:alert(1)';
    check((await call('/admin/site-content', { token, method: 'PUT', body: { content: unsafe, expectedVersion: publish.data.version } })).status === 400, 'Unsafe media URL rejected');
    check((await call('/admin/media/prepare', { token, method: 'POST', body: { name: 'test.svg', mimeType: 'image/svg+xml', size: 50 } })).status === 400, 'Active SVG upload rejected');
    check((await call('/admin/media/prepare', { token, method: 'POST', body: { name: 'big.png', mimeType: 'image/png', size: 11 * 1024 * 1024 } })).status === 400, 'Oversized image rejected');
    const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO3sAAAAASUVORK5CYII=', 'base64');
    const prepared = await call('/admin/media/prepare', { token, method: 'POST', body: { name: 'verification.png', mimeType: 'image/png', size: bytes.length } });
    check(prepared.status === 201, 'Unique upload reservation succeeds');
    asset = prepared.data;
    const client = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    check(!(await client.storage.from('cabinet-media').upload(asset.path, bytes, { contentType: 'image/png', upsert: false })).error, 'Administrator direct Storage upload allowed');
    const finalized = await call('/admin/media/finalize', { token, method: 'POST', body: { path: asset.path } });
    check(finalized.status === 200 && finalized.data.status === 'ready', `Uploaded bytes and metadata verified (HTTP ${finalized.status})`);
    const referenced = structuredClone(edited); referenced.hero.imageUrl = asset.url;
    const latest = await call('/admin/site-content', { token });
    const publishedMedia = await call('/admin/site-content', { token, method: 'PUT', body: { content: referenced, expectedVersion: latest.data.version } });
    check(publishedMedia.status === 200, 'Ready media can be published');
    check((await call('/admin/media/delete', { token, method: 'POST', body: { path: asset.path } })).status === 409, 'Referenced media deletion rejected atomically');
    check(!!(await client.storage.from('cabinet-media').remove([asset.path])).error || (await client.storage.from('cabinet-media').info(asset.path)).data !== null, 'Direct Storage delete cannot bypass reference guard');
  } finally {
    if (changed) {
      const latest = await call('/admin/site-content', { token });
      const restored = await call('/admin/site-content', { token, method: 'PUT', body: { content: original, expectedVersion: latest.data.version } });
      check(restored.status === 200, 'Original site content restored');
    }
    if (asset) check((await call('/admin/media/delete', { token, method: 'POST', body: { path: asset.path } })).status === 204, 'Unreferenced test media safely deleted');
    const adminClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    await adminClient.auth.setSession({ access_token: admin.access_token, refresh_token: admin.refresh_token });
    await adminClient.auth.signOut({ scope: 'local' });
  }
  console.info(JSON.stringify({ passed, adminChecks: 'passed', fixturesRemoved: true }));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { await run(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
