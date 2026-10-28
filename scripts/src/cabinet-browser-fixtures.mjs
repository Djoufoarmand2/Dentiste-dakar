import { writeFile, chmod, mkdir } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { verifiedAdminSession } from './check-cabinet-supabase.mjs';

const session = await verifiedAdminSession();
if (!session) throw new Error('Verify the administrator email before browser testing.');
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const ordinary = {
  email: `cabinet-browser-${randomUUID()}@example.invalid`,
  password: randomBytes(28).toString('base64url'),
};
const created = await client.auth.admin.createUser({ ...ordinary, email_confirm: true });
if (created.error) throw new Error('Unable to create isolated browser fixture.');
const fixtures = {
  adminSession: session,
  storageKey: `sb-${new URL(process.env.SUPABASE_URL).hostname.split('.')[0]}-auth-token`,
  ordinary,
  ordinaryUserId: created.data.user.id,
};
// Ephemeral test credentials: never print, commit, serve over HTTP or deliver.
const path = '/tmp/cabinet-ui-auth.json';
await writeFile(path, JSON.stringify(fixtures), { mode: 0o600 });
await chmod(path, 0o600);
await mkdir('generated-artifacts/cabinet-ui-fixtures', { recursive: true });
await writeFile('generated-artifacts/cabinet-ui-fixtures/test.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO3sAAAAASUVORK5CYII=', 'base64'));
console.info('Ephemeral browser fixtures ready. No credentials logged.');
