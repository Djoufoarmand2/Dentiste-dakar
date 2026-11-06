import { createClient } from '@supabase/supabase-js';
import {
  CreateAdminReviewBody, DeleteAdminReviewParams, PublishAdminContentBody, PrepareAdminMediaBody,
  FinalizeAdminMediaBody, DeleteAdminMediaBody, SubmitReviewBody,
  SubmitContactAppointmentBody, SubmitContactAppointmentResponse,
} from '../../../lib/api-zod/src/generated/api';
import { mimeExtensions, normalizePublicationInput, parseContent, publicContent, signatureMatches } from './validation';

declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
const env = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing server configuration: ${key}`);
  return value;
};
const url = env('SUPABASE_URL').replace(/\/$/, '');
const secret = env('SUPABASE_SERVICE_ROLE_KEY');
const allowedOrigins = new Set(env('CABINET_ALLOWED_ORIGINS').split(',').map((s) => s.trim()).filter(Boolean));
const mediaBucket = 'cabinet-media';
const mediaBaseUrl = `${url}/storage/v1/object/public/${mediaBucket}`;
const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const reviewRateLimitKey = crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(secret),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign'],
);

class HttpError extends Error {
  constructor(public status: number, message: string, public retryAt?: string) { super(message); }
}

async function body(request: Request) {
  if (Number(request.headers.get('content-length')) > 1_048_576) throw new HttpError(413, 'Le contenu envoyé est trop volumineux.');
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'Un document JSON est requis.');
  // Stream with a bound even when Content-Length is missing or untrusted.
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Le contenu est vide.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 1_048_576) { await reader.cancel(); throw new HttpError(413, 'Le contenu envoyé est trop volumineux.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new HttpError(400, 'Le document JSON est invalide.'); }
}

async function administrator(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new HttpError(401, 'Connexion requise.');
  const { data, error } = await db.auth.getUser(authorization.slice(7));
  if (error || !data.user || !data.user.email_confirmed_at) throw new HttpError(401, 'Session invalide ou adresse non vérifiée.');
  const { data: isAdmin, error: claimError } = await db.rpc('cabinet_claim_admin', { p_user_id: data.user.id });
  if (claimError) throw new HttpError(503, 'Impossible de vérifier les droits administrateur.');
  return { userId: data.user.id, isAdmin: isAdmin === true };
}

function asset(row: Record<string, unknown>) {
  return { path: row.path, url: row.public_url, name: row.name, mimeType: row.mime_type, size: Number(row.size), status: row.status };
}

function review(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    service: row.service,
    quote: row.quote,
    rating: Number(row.rating),
    createdAt: row.created_at,
    source: row.source,
  };
}

async function checkReviewRate(request: Request) {
  // Cloudflare supplies this header at the edge. Do not trust arbitrary
  // forwarding headers or use a shared "unknown" bucket when it is absent.
  const ip = request.headers.get('cf-connecting-ip')?.trim();
  if (!ip || ip.length > 45 || /[\s,]/.test(ip)) {
    throw new HttpError(503, 'La protection anti-abus est momentanément indisponible.');
  }
  const signature = await crypto.subtle.sign(
    'HMAC',
    await reviewRateLimitKey,
    new TextEncoder().encode(ip),
  );
  const ipHash = Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const { data, error } = await db.rpc('cabinet_allow_review_submission', { p_ip_hash: ipHash });
  const decision = Array.isArray(data) ? data[0] : null;
  if (
    error
    || !decision
    || typeof decision.is_allowed !== 'boolean'
    || (decision.retry_at !== null && typeof decision.retry_at !== 'string')
  ) {
    throw new HttpError(503, 'La protection anti-abus est momentanément indisponible.');
  }
  if (!decision.is_allowed) {
    const retryAtMilliseconds = typeof decision.retry_at === 'string' ? Date.parse(decision.retry_at) : Number.NaN;
    if (!Number.isFinite(retryAtMilliseconds)) {
      throw new HttpError(503, 'La protection anti-abus est momentanément indisponible.');
    }
    const retryAt = new Date(retryAtMilliseconds).toISOString();
    throw new HttpError(429, 'Vous avez déjà envoyé plusieurs demandes. Réessayez plus tard.', retryAt);
  }
}

async function getAsset(path: string) {
  if (!/^uploads\/[a-f0-9-]+\.(jpg|png|webp|gif|mp4|webm)$/.test(path)) throw new HttpError(400, 'Chemin de média invalide.');
  const { data, error } = await db.from('cabinet_media').select('*').eq('path', path).maybeSingle();
  if (error) throw new HttpError(503, 'La médiathèque est indisponible.');
  if (!data) throw new HttpError(404, 'Média introuvable.');
  return data;
}

export async function handleRequest(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', Vary: 'Origin',
  };
  if (origin && allowedOrigins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  function respond(payload: unknown, status = 200) {
    return new Response(status === 204 ? null : JSON.stringify(payload), { status, headers });
  }
  try {
    if (origin && !allowedOrigins.has(origin)) throw new HttpError(403, 'Origine non autorisée.');
    if (request.method === 'OPTIONS') {
      headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'authorization,apikey,content-type,x-client-info';
      return respond(null, 204);
    }
    const path = new URL(request.url).pathname.split('/cabinet-api')[1] || '/';
    if (request.method === 'GET' && path === '/site-content') {
      const { data, error } = await db.from('cabinet_site_content').select('content').eq('id', true).single();
      if (error || !data) throw new HttpError(503, 'Le contenu du site est temporairement indisponible.');
      return respond(publicContent(data.content));
    }
    if (request.method === 'POST' && path === '/contact/appointment') {
      const parsed = SubmitContactAppointmentBody.safeParse(await body(request));
      if (!parsed.success) throw new HttpError(400, 'Vérifiez les informations du formulaire.');
      if (parsed.data.website?.trim()) {
        return respond(SubmitContactAppointmentResponse.parse({ accepted: true }));
      }

      const name = parsed.data.name.trim();
      const phone = parsed.data.phone.trim();
      if (!name || !phone) throw new HttpError(400, 'Le nom et le numéro de téléphone sont obligatoires.');
      await checkReviewRate(request); // Shared anti-abuse quota for public submissions.
      const id = parsed.data.submissionId ?? crypto.randomUUID();
      const { error } = await db.from('cabinet_appointments').upsert({
        id, name, phone, email: parsed.data.email.trim().toLowerCase(),
        service: parsed.data.service, preferred_date: parsed.data.preferredDate || null,
        message: parsed.data.message?.trim() || null,
      }, { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw new HttpError(503, 'Impossible d’enregistrer votre demande. Réessayez ou contactez le cabinet.');
      return respond(SubmitContactAppointmentResponse.parse({ accepted: true, requestId: id }));
    }
    if (request.method === 'GET' && path === '/reviews') {
      const { data, error } = await db.from('cabinet_reviews').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw new HttpError(503, 'Les avis sont temporairement indisponibles.');
      return respond((data ?? []).map((row) => review(row)));
    }
    if (request.method === 'POST' && path === '/reviews') {
      const parsed = SubmitReviewBody.safeParse(await body(request));
      if (!parsed.success) throw new HttpError(400, 'Vérifiez le nom, la note, le commentaire et votre autorisation de publication.');
      if (parsed.data.website?.trim()) throw new HttpError(400, 'La demande n’a pas pu être validée.');
      const name = parsed.data.name.trim();
      const service = parsed.data.service?.trim() ?? '';
      const quote = parsed.data.quote.trim();
      if (name.length < 2 || quote.length < 12 || service.length > 120) {
        throw new HttpError(400, 'Vérifiez le nom affiché et le commentaire de votre avis.');
      }
      await checkReviewRate(request);
      const { data, error } = await db.from('cabinet_reviews').insert({
        name,
        service,
        quote,
        rating: parsed.data.rating,
        source: 'visitor',
      }).select('*').single();
      if (error || !data) throw new HttpError(503, 'Impossible d’enregistrer votre avis pour le moment.');
      return respond(review(data), 201);
    }
    if (!path.startsWith('/admin/')) throw new HttpError(404, 'Ressource introuvable.');
    const admin = await administrator(request);
    if (request.method === 'GET' && path === '/admin/access') return respond({ isAdmin: admin.isAdmin });
    if (!admin.isAdmin) throw new HttpError(403, 'Accès réservé à l’administrateur du cabinet.');
    if (request.method === 'GET' && path === '/admin/appointments') {
      const { data, error } = await db.from('cabinet_appointments').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw new HttpError(503, 'Impossible de charger les demandes.');
      return respond((data ?? []).map(row => ({
        id: row.id, name: row.name, phone: row.phone, email: row.email,
        service: row.service, preferredDate: row.preferred_date, message: row.message,
        createdAt: row.created_at,
      })));
    }
    if (request.method === 'DELETE' && path.startsWith('/admin/appointments/')) {
      const id = path.slice('/admin/appointments/'.length);
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) throw new HttpError(400, 'Identifiant invalide.');
      const { error } = await db.from('cabinet_appointments').delete().eq('id', id);
      if (error) throw new HttpError(503, 'Impossible de supprimer la demande.');
      return respond(null, 204);
    }
    if (request.method === 'GET' && path === '/admin/reviews') {
      const { data, error } = await db.from('cabinet_reviews').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw new HttpError(503, 'Impossible de charger les avis.');
      return respond((data ?? []).map((row) => review(row)));
    }
    if (request.method === 'POST' && path === '/admin/reviews') {
      const parsed = CreateAdminReviewBody.safeParse(await body(request));
      if (!parsed.success) throw new HttpError(400, 'Vérifiez les champs de l’avis.');
      const name = parsed.data.name.trim();
      const service = parsed.data.service?.trim() ?? '';
      const quote = parsed.data.quote.trim();
      if (name.length < 2 || !quote || service.length > 120) throw new HttpError(400, 'Vérifiez les champs de l’avis.');
      const { data, error } = await db.from('cabinet_reviews').insert({
        name,
        service,
        quote,
        rating: parsed.data.rating,
        source: 'admin',
      }).select('*').single();
      if (error || !data) throw new HttpError(503, 'Impossible d’enregistrer cet avis.');
      return respond(review(data), 201);
    }
    if (request.method === 'DELETE' && path.startsWith('/admin/reviews/')) {
      const parsed = DeleteAdminReviewParams.safeParse({ id: path.slice('/admin/reviews/'.length) });
      if (!parsed.success) throw new HttpError(400, 'Identifiant d’avis invalide.');
      const { data, error } = await db.from('cabinet_reviews').delete().eq('id', parsed.data.id).select('id').maybeSingle();
      if (error) throw new HttpError(503, 'Impossible de supprimer cet avis.');
      if (!data) throw new HttpError(404, 'Avis introuvable.');
      return respond(null, 204);
    }
    if (path === '/admin/site-content' && request.method === 'GET') {
      const { data, error } = await db.from('cabinet_site_content').select('content,version').eq('id', true).single();
      if (error) throw new HttpError(503, 'Impossible de charger le contenu.');
      return respond(data);
    }
    if (path === '/admin/site-content' && request.method === 'PUT') {
      const parsed = PublishAdminContentBody.safeParse(normalizePublicationInput(await body(request)));
      if (!parsed.success) throw new HttpError(400, 'Vérifiez les champs du contenu et la version de publication.');
      let content;
      try { content = parseContent(parsed.data.content, mediaBaseUrl); }
      catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Contenu invalide.'); }
      const { data, error } = await db.rpc('cabinet_publish', {
        p_actor: admin.userId, p_expected_version: parsed.data.expectedVersion, p_content: content,
      });
      if (error?.message.includes('version_conflict')) throw new HttpError(409, 'Une autre publication a eu lieu. Rechargez le contenu avant de réessayer ; vos modifications restent affichées.');
      if (error?.message.includes('media_not_ready')) throw new HttpError(409, 'Un média a été supprimé ou son transfert est incomplet. Sélectionnez un média disponible.');
      if (error) throw new HttpError(503, 'La publication a échoué. Vos modifications ne sont pas perdues.');
      return respond(data);
    }
    if (path === '/admin/media' && request.method === 'GET') {
      const { data, error } = await db.from('cabinet_media').select('*').order('created_at', { ascending: false }).limit(1000);
      if (error) throw new HttpError(503, 'La médiathèque est indisponible.');
      return respond({ items: data.map(asset) });
    }
    if (path === '/admin/media/prepare' && request.method === 'POST') {
      const parsed = PrepareAdminMediaBody.safeParse(await body(request));
      if (!parsed.success) throw new HttpError(400, 'Fichier non accepté ou supérieur à 50 Mo.');
      const file = parsed.data;
      if (file.mimeType.startsWith('image/') && file.size > 10 * 1024 * 1024) throw new HttpError(400, 'Une image ne doit pas dépasser 10 Mo.');
      const { count, error: countError } = await db.from('cabinet_media').select('path', { count: 'exact', head: true });
      if (countError || count === null) throw new HttpError(503, 'La médiathèque est indisponible.');
      if (count >= 1000) throw new HttpError(409, 'La médiathèque a atteint 1 000 fichiers. Retirez les fichiers inutilisés.');
      const path = `uploads/${crypto.randomUUID()}.${mimeExtensions[file.mimeType]}`;
      const row = { path, public_url: `${mediaBaseUrl}/${path}`, name: file.name, mime_type: file.mimeType, size: file.size, status: 'uploading' };
      const { error } = await db.from('cabinet_media').insert(row);
      if (error) throw new HttpError(503, 'Impossible de préparer le transfert.');
      return respond(asset(row), 201);
    }
    if (path === '/admin/media/finalize' && request.method === 'POST') {
      const parsed = FinalizeAdminMediaBody.safeParse(await body(request));
      if (!parsed.success) throw new HttpError(400, 'Référence de média invalide.');
      const row = await getAsset(parsed.data.path);
      if (row.status === 'deleting') throw new HttpError(409, 'Ce média est en cours de suppression.');
      const { data: info, error } = await db.storage.from(mediaBucket).info(row.path);
      if (error || !info) throw new HttpError(400, 'Le transfert du média est incomplet.');
      if (Number(info.size) !== Number(row.size) || info.contentType !== row.mime_type) throw new HttpError(400, 'Les caractéristiques du fichier ne correspondent pas au transfert prévu.');
      const response = await fetch(`${url}/storage/v1/object/authenticated/${mediaBucket}/${row.path}`, {
        headers: { apikey: secret, Authorization: `Bearer ${secret}`, Range: 'bytes=0-31' },
      });
      const reader = response.body?.getReader();
      const prefix = new Uint8Array(32);
      let prefixLength = 0;
      while (reader && prefixLength < prefix.length) {
        const { value, done } = await reader.read();
        if (done) break;
        const take = Math.min(value.length, prefix.length - prefixLength);
        prefix.set(value.subarray(0, take), prefixLength);
        prefixLength += take;
      }
      await reader?.cancel();
      if (!response.ok || !signatureMatches(prefix.subarray(0, prefixLength), row.mime_type)) throw new HttpError(400, 'Le fichier ne correspond pas au format annoncé.');
      const update = await db.from('cabinet_media').update({ status: 'ready' }).eq('path', row.path).eq('status', 'uploading').select('*').maybeSingle();
      if (update.error || (!update.data && row.status !== 'ready')) throw new HttpError(409, 'Ce média n’est plus disponible.');
      return respond(asset(update.data ?? row));
    }
    if (path === '/admin/media/delete' && request.method === 'POST') {
      const parsed = DeleteAdminMediaBody.safeParse(await body(request));
      if (!parsed.success) throw new HttpError(400, 'Référence de média invalide.');
      const row = await getAsset(parsed.data.path);
      const { error } = await db.rpc('cabinet_begin_delete_media', { p_actor: admin.userId, p_path: row.path });
      if (error?.message.includes('media_referenced')) throw new HttpError(409, 'Ce média est encore utilisé. Retirez-le du contenu et publiez avant de le supprimer.');
      if (error) throw new HttpError(503, 'Impossible de vérifier les références du média.');
      const removed = await db.storage.from(mediaBucket).remove([row.path]);
      if (removed.error) throw new HttpError(503, 'Suppression interrompue. Réessayez depuis la médiathèque.');
      const deleted = await db.from('cabinet_media').delete().eq('path', row.path).eq('status', 'deleting');
      if (deleted.error) throw new HttpError(503, 'Le fichier est retiré mais sa référence doit être nettoyée. Réessayez.');
      return respond(null, 204);
    }
    throw new HttpError(404, 'Ressource introuvable.');
  } catch (error) {
    // Do not leak database responses, JWTs, content or personal data in errors.
    if (error instanceof HttpError && error.retryAt) {
      headers['Retry-After'] = String(Math.max(1, Math.ceil((Date.parse(error.retryAt) - Date.now()) / 1000)));
      return respond({ error: error.message, retryAt: error.retryAt }, error.status);
    }
    return respond({ error: error instanceof HttpError ? error.message : 'Le service est momentanément indisponible.' }, error instanceof HttpError ? error.status : 503);
  }
}

Deno.serve(handleRequest);
