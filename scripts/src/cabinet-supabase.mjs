/**
 * Cabinet migration operations. Credentials are read from the environment only;
 * no keys, session tokens, emails or raw provider responses are printed.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const required = (name) => {
  if (!process.env[name]) throw new Error(`Configuration manquante : ${name}`);
  return process.env[name];
};
const url = required('SUPABASE_URL').replace(/\/$/, '');
const ref = new URL(url).hostname.split('.')[0];
const token = required('SUPABASE_ACCESS_TOKEN');
const service = required('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const origin = `https://${required('REPLIT_DEV_DOMAIN')}`;
// Exact local origins are needed by the workspace's screenshot/browser preview.
const previewOrigins = [origin, 'http://127.0.0.1', 'http://localhost'].join(',');
const mediaBaseUrl = `${url}/storage/v1/object/public/cabinet-media`;
const sha = (text) => createHash('sha256').update(text).digest('hex');
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;

export async function management(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}${path}`, { ...init, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Opération Supabase refusée : ${path.split('?')[0]} (HTTP ${response.status}).`);
  return data;
}
export const sql = (query, readOnly = false) => management('/database/query', { method: 'POST', body: JSON.stringify({ query, read_only: readOnly }) });
function checked(result, label) {
  if (result.error) throw new Error(`${label} a échoué (${result.error.statusCode || result.error.code || 'provider'}).`);
  return result.data;
}

async function source() {
  const blob = checked(await supabase.storage.from('cabinet-site-content').download('cms/site-content.json'), 'Lecture du contenu initial');
  const text = await blob.text();
  const data = JSON.parse(text);
  if (!data.clinic || !data.hero || !Array.isArray(data.blogPosts)) throw new Error('Contenu initial invalide.');
  return { text, data };
}

async function backup() {
  const original = await source();
  const path = `backups/pre-supabase-backend-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  checked(await supabase.storage.from('cabinet-site-content').upload(path, original.text, { contentType: 'application/json', upsert: false }), 'Sauvegarde');
  const copy = checked(await supabase.storage.from('cabinet-site-content').download(path), 'Vérification sauvegarde');
  if (sha(await copy.text()) !== sha(original.text)) throw new Error('La sauvegarde ne correspond pas à la source.');
  console.info(JSON.stringify({ backup: path, verified: true }));
  return original;
}

async function setup() {
  const original = await backup();
  const before = await sql("select json_build_object('tables',coalesce((select json_agg(table_name) from information_schema.tables where table_schema='public'),'[]'::json),'storage_policies',coalesce((select json_agg(policyname) from pg_policies where schemaname='storage' and tablename='objects'),'[]'::json)) as inventory", true);
  console.info(JSON.stringify({ preflightInventory: before }));
  const auth = await management('/config/auth');
  const authBackup = {
    uri_allow_list: auth.uri_allow_list, site_url: auth.site_url,
    disable_signup: auth.disable_signup, external_email_enabled: auth.external_email_enabled,
  };
  checked(await supabase.storage.from('cabinet-site-content').upload('backups/auth-before-cabinet-migration.json', JSON.stringify(authBackup), { contentType: 'application/json', upsert: false }).then((result) => {
    // Keep the first pre-migration configuration on replay.
    if (String(result.error?.statusCode) === '409' || result.error?.message?.includes('already exists')) return { data: null, error: null };
    return result;
  }), 'Sauvegarde de la configuration');
  await sql(await readFile(resolve(root, 'supabase/migrations/202610280001_cabinet_backend.sql'), 'utf8'));
  const adminEmail = required('ADMIN_EMAIL').trim().toLowerCase();
  await sql(`insert into public.cabinet_config(id,admin_email,media_base_url) values (true,${sqlString(adminEmail)},${sqlString(mediaBaseUrl)}) on conflict(id) do nothing;`);
  checked(await supabase.from('cabinet_site_content').upsert({ id: true, content: original.data, version: 1 }, { onConflict: 'id', ignoreDuplicates: true }), 'Import initial');
  const doc = checked(await supabase.from('cabinet_site_content').select('content,version').eq('id', true).single(), 'Relecture import');
  // First import must preserve the complete original document, including drafts.
  if (doc.version === 1 && JSON.stringify(doc.content) !== JSON.stringify(original.data)) {
    // PostgreSQL reorders object keys: compare recursively, not byte order.
    const normalize = (v) => Array.isArray(v) ? v.map(normalize) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a],[b]) => a.localeCompare(b)).map(([k,x]) => [k,normalize(x)])) : v;
    if (JSON.stringify(normalize(doc.content)) !== JSON.stringify(normalize(original.data))) throw new Error('L’import ne correspond pas à la source : bascule refusée.');
  }
  const buckets = checked(await supabase.storage.listBuckets(), 'Liste des buckets');
  if (!buckets.some((b) => b.name === 'cabinet-media')) {
    checked(await supabase.storage.createBucket('cabinet-media', {
      public: true, fileSizeLimit: 50 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'],
    }), 'Création du stockage médias');
  }
  const redirects = new Set((auth.uri_allow_list || '').split(',').map((s) => s.trim()).filter(Boolean));
  redirects.add(`${origin}/auth/callback`);
  await management('/config/auth', { method: 'PATCH', body: JSON.stringify({ uri_allow_list: [...redirects].join(',') }) });
  await management('/secrets', { method: 'POST', body: JSON.stringify([{ name: 'CABINET_ALLOWED_ORIGINS', value: previewOrigins }]) });
  const users = checked(await supabase.auth.admin.listUsers({ perPage: 1000 }), 'Vérification du compte autorisé').users;
  const admin = users.find((u) => u.email?.trim().toLowerCase() === adminEmail);
  console.info(JSON.stringify({ schema: 'applied', contentImported: true, publicationVersion: doc.version, administratorExists: !!admin, administratorVerified: !!admin?.email_confirmed_at, otherAccountsPreserved: users.length - (admin ? 1 : 0) }));
}

async function deploy() {
  const web3FormsAccessKey = process.env.WEB3FORMS_ACCESS_KEY?.trim();
  if (web3FormsAccessKey) {
    await management('/secrets', {
      method: 'POST',
      body: JSON.stringify([{ name: 'WEB3FORMS_ACCESS_KEY', value: web3FormsAccessKey }]),
    });
  }
  const result = await build({
    entryPoints: [resolve(root, 'supabase/functions/cabinet-api/index.ts')], bundle: true, write: false,
    platform: 'neutral', format: 'esm', target: 'es2022', minify: false,
    nodePaths: [resolve(root, 'scripts/node_modules')], conditions: ['deno', 'import'],
    external: ['npm:@supabase/supabase-js@2.118.0'],
    plugins: [{ name: 'supabase-deno-runtime', setup(b) { b.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({ path: 'npm:@supabase/supabase-js@2.118.0', external: true })); } }],
  });
  const code = result.outputFiles[0].text;
  const out = resolve(root, 'generated-artifacts/supabase/cabinet-api.mjs');
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, code);
  const form = new FormData();
  form.set('metadata', JSON.stringify({ name: 'cabinet-api', entrypoint_path: 'index.ts', verify_jwt: false }));
  form.append('file', new Blob([code], { type: 'application/typescript' }), 'index.ts');
  const deployed = await management('/functions/deploy?slug=cabinet-api', { method: 'POST', body: form });
  console.info(JSON.stringify({ function: deployed.slug, status: deployed.status, version: deployed.version }));
}

async function inspect() {
  console.info(JSON.stringify(await sql("select json_build_object('content_rows',(select count(*) from public.cabinet_site_content),'admin_bindings',(select count(*) from public.cabinet_admins),'media_count',(select count(*) from public.cabinet_media),'rls_tables',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'cabinet_%' and c.relrowsecurity)) as checks", true)));
}

async function migrateReviews() {
  await sql(await readFile(resolve(root, 'supabase/migrations/202610290001_cabinet_reviews.sql'), 'utf8'));
  const result = await sql("select json_build_object('exists',to_regclass('public.cabinet_reviews') is not null,'rls',(select relrowsecurity from pg_class where oid=to_regclass('public.cabinet_reviews')),'rows',(select count(*) from public.cabinet_reviews)) as checks", true);
  console.info(JSON.stringify({ reviewsMigration: 'applied', checks: result }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const operation = { setup, backup, deploy, inspect, 'migrate-reviews': migrateReviews }[process.argv[2]];
  if (!operation) throw new Error('Commande attendue : setup, backup, deploy, inspect ou migrate-reviews.');
  try { await operation(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
