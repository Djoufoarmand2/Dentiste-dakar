import { readFile, writeFile } from 'node:fs/promises';

const generatedPath = new URL('../lib/api-zod/src/generated/api.ts', import.meta.url);
const edgePath = new URL('../supabase/functions/cabinet-api/api.ts', import.meta.url);
const generated = await readFile(generatedPath, 'utf8');
const denoCompatible = generated.replace(
  /from ['"]zod['"]/g,
  'from "npm:zod@3.25.76"',
);

if (denoCompatible === generated) {
  throw new Error('Generated API contract did not contain the expected Zod import.');
}

await writeFile(edgePath, denoCompatible);
console.info('Synced generated API contract to the Supabase Edge Function.');
