import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const fixturePath = '/tmp/cabinet-appointments-browser-session.json';
async function testSession() {
  // generateLink does not send email or change the administrator's password.
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email: process.env.ADMIN_EMAIL });
  if (link.error) throw new Error('Test session preparation failed.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.auth.verifyOtp({ token_hash: link.data.properties.hashed_token, type: 'magiclink' });
  if (result.error || !result.data.session) throw new Error('Test session verification failed.');
  return result.data.session;
}
async function call(path, init = {}, token) {
  return fetch(`${url}/functions/v1/cabinet-api${path}`, {
    ...init,
    headers: { apikey: key, Origin: origin, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}
const mode = process.argv[2] || 'api';
if (mode === 'session') {
  const session = await testSession();
  await writeFile(fixturePath, JSON.stringify({
    storageKey: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`,
    session,
    requestName: `TEST-AUDIT-CF-${randomUUID()}`,
  }), { mode: 0o600 });
  console.info('Temporary browser session prepared; credentials suppressed.');
} else if (mode === 'cleanup') {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  const removed = await admin.from('cabinet_appointments').delete().eq('name', fixture.requestName);
  if (removed.error) throw new Error('Fixture cleanup failed.');
  await admin.auth.admin.signOut(fixture.session.access_token, 'local');
  await unlink(fixturePath);
  console.info('Browser fixture and its isolated authentication session removed.');
} else {
  const id = randomUUID();
  let session;
  try {
    assert.equal((await call('/admin/appointments')).status, 401);
    assert.equal((await call('/admin/appointments/' + id, { method: 'DELETE' })).status, 401);
    assert.equal((await call('/contact/appointment', { method: 'POST', body: '{}' })).status, 400);
    const request = { name: 'TEST API APPOINTMENT', phone: '+237600000000', email: 'audit@example.com', service: 'Consultation dentaire', submissionId: id, message: 'Fictitious test. Delete after verification.' };
    const first = await call('/contact/appointment', { method: 'POST', body: JSON.stringify(request) });
    assert.equal(first.status, 200);
    assert.equal((await first.json()).requestId, id);
    assert.equal((await call('/contact/appointment', { method: 'POST', body: JSON.stringify(request) })).status, 200);
    const stored = await admin.from('cabinet_appointments').select('id', { count: 'exact' }).eq('id', id);
    assert.equal(stored.error, null);
    assert.equal(stored.count, 1, 'Retries must not create duplicate requests');
    const anonymous = createClient(url, key, { auth: { persistSession: false } });
    const denied = await anonymous.from('cabinet_appointments').select('id');
    assert.ok(denied.error || denied.data?.length === 0, 'No anonymous access to patient records');
    session = await testSession();
    const listing = await call('/admin/appointments', {}, session.access_token);
    assert.equal(listing.status, 200);
    assert.ok((await listing.json()).some(row => row.id === id));
    assert.equal((await call('/admin/appointments/' + id, { method: 'DELETE' }, session.access_token)).status, 204);
    const after = await admin.from('cabinet_appointments').select('id').eq('id', id);
    assert.equal(after.data?.length, 0);
    console.info('PASS: validation, private storage, idempotency, anonymous denial, authenticated listing and deletion.');
  } finally {
    await admin.from('cabinet_appointments').delete().eq('id', id);
    if (session) await admin.auth.admin.signOut(session.access_token, 'local');
  }
}
