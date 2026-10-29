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

  const allowed = results.filter(({ data }) => data === true).length;
  const denied = results.filter(({ data }) => data === false).length;
  assert.equal(allowed, 3, `Expected exactly three concurrent submissions to pass; got ${allowed}`);
  assert.equal(denied, 9, `Expected the other concurrent submissions to be denied; got ${denied}`);

  const { data: followUp, error: followUpError } = await clients[0]
    .rpc('cabinet_allow_review_submission', { p_ip_hash: testDigest });
  assert.equal(followUpError, null, 'Follow-up PostgreSQL rate-limit RPC must succeed');
  assert.equal(followUp, false, 'Submissions after the concurrent limit must be denied');

  console.info('PASS: exactly 3 of 12 concurrent submissions were allowed; the next was denied.');
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
