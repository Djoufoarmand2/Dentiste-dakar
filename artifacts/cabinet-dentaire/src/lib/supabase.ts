import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('La connexion Supabase du cabinet doit être configurée.');

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
export const supabaseUrl: string = url;
export const supabasePublicKey: string = key;
export const mediaBucket = 'cabinet-media';

export class CmsError extends Error {
  constructor(message: string, public status: number, public retryAt?: string) { super(message); }
}

export async function cmsRequest<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('apikey', key);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new CmsError('Connectez-vous pour continuer.', 401);
    headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  const response = await fetch(`${url}/functions/v1/cabinet-api${path}`, { ...options, headers });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new CmsError(payload?.error || 'Le service est momentanément indisponible.', response.status, payload?.retryAt);
  return payload as T;
}
