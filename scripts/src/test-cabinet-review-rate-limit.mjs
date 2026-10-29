import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Configuration manquante : ${name}`);
  return value;
}

async function run() {
  const url = required('SUPABASE_URL').replace(/\/$/, '');
  const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY');

  // A random digest stands in for the edge function's HMAC. No IP address is
  // used or persisted, and this unique fixture expires with the 10-minute window.
  const testDigest = randomBytes(32).toString('hex');
  const clients = Array.from({ length: 4 }, () => createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

  // Independent clients model requests reaching separate Edge Function instances.
  const results = await Promise.all(Array.from({ length: 12 }, (_, index) =>
    clients[index % clients.length].rpc('cabinet_allow_review_submission', {
      p_ip_hash: testDigest,
    }),
  ));

  if (results.some(({ error }) => error)) {
    throw new Error(
      'Le RPC PostgreSQL de limitation est indisponible. Vérifiez que la migration est appliquée, que le cache de schéma Supabase est actualisé et que le rôle service_role peut appeler la fonction.',
    );
  }

  const decisions = results.map(({ data }) => Array.isArray(data) ? data[0] : null);
  const allowed = decisions.filter((decision) => decision?.is_allowed === true).length;
  const denied = decisions.filter((decision) => decision?.is_allowed === false).length;
  assert.equal(allowed, 3, `Expected exactly three concurrent submissions to pass; got ${allowed}`);
  assert.equal(denied, 9, `Expected the other concurrent submissions to be denied; got ${denied}`);
  const retryTimes = decisions
    .filter((decision) => decision?.is_allowed === false)
    .map((decision) => Date.parse(decision.retry_at));
  assert.ok(retryTimes.every(Number.isFinite), 'Every denied submission must include a valid retry timestamp');
  assert.equal(new Set(retryTimes).size, 1, 'Denied submissions must agree on the same next available time');
  assert.ok(retryTimes[0] > Date.now(), 'The retry timestamp must still be in the future');
  assert.ok(retryTimes[0] <= Date.now() + 10 * 60 * 1000, 'The retry timestamp must be within the rate-limit window');

  const { data: followUp, error: followUpError } = await clients[0]
    .rpc('cabinet_allow_review_submission', { p_ip_hash: testDigest });
  assert.equal(followUpError, null, 'Follow-up PostgreSQL rate-limit RPC must succeed');
  assert.equal(followUp?.[0]?.is_allowed, false, 'Submissions after the concurrent limit must be denied');
  assert.equal(Date.parse(followUp?.[0]?.retry_at), retryTimes[0], 'A repeated denial must preserve the same retry timestamp');

  console.info('PASS: exactly 3 of 12 concurrent submissions were allowed; denials shared a reliable retry timestamp.');
  console.info('PASS: requests used independent Supabase clients and no persistent raw IP fixture.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await run();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
