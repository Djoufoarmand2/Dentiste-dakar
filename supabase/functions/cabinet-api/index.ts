import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import {
  CreateAdminReviewBody, DeleteAdminReviewParams, PublishAdminContentBody, PrepareAdminMediaBody,
  FinalizeAdminMediaBody, DeleteAdminMediaBody, SubmitReviewBody,
  SubmitContactAppointmentBody, SubmitContactAppointmentResponse,
  SubmitContactQuestionBody, SubmitContactQuestionResponse, UpdateContactNotificationStatusBody,
  UpdateAdminAppointmentParams, UpdateAdminAppointmentBody,
  GetAdminContactQuestionsResponse, UpdateAdminContactQuestionParams,
  UpdateAdminContactQuestionBody, DeleteAdminContactQuestionParams,
  GetAdminMessagingSettingsResponse, UpdateAdminMessagingSettingsBody,
  ValidateAdminWhatsAppSettingsResponse,
} from './api.ts';
import { mimeExtensions, normalizePublicationInput, parseContent, publicContent, signatureMatches } from './validation.ts';

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
  ['sign', 'verify'],
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

type ContactType = 'appointment' | 'question';
type ContactChannel = 'email' | 'whatsapp' | 'both';
type NotificationStatus = 'pending' | 'sending' | 'accepted' | 'failed' | 'not_requested' | 'not_configured';

function usesEmail(channel: ContactChannel) { return channel === 'email' || channel === 'both'; }
function usesWhatsApp(channel: ContactChannel) { return channel === 'whatsapp' || channel === 'both'; }

function encodeBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function contactStatusToken(type: ContactType, id: string) {
  const signature = await crypto.subtle.sign(
    'HMAC',
    await reviewRateLimitKey,
    new TextEncoder().encode(`contact-email-status:${type}:${id}`),
  );
  return encodeBase64Url(new Uint8Array(signature));
}

async function validContactStatusToken(type: ContactType, id: string, token: string) {
  try {
    return await crypto.subtle.verify(
      'HMAC',
      await reviewRateLimitKey,
      decodeBase64Url(token),
      new TextEncoder().encode(`contact-email-status:${type}:${id}`),
    );
  } catch {
    return false;
  }
}

async function readMessagingSettings() {
  const { data, error } = await db.from('cabinet_messaging_settings').select('*').eq('id', true).maybeSingle();
  if (error) throw new HttpError(503, 'Les réglages de messagerie sont indisponibles.');
  return data ?? {
    email_auto_responder_active: false,
    whatsapp_enabled: false,
    whatsapp_waba_id: null,
    whatsapp_phone_number_id: null,
    whatsapp_template_name: null,
    whatsapp_template_language: 'fr',
    whatsapp_validated_at: null,
  };
}

function publicMessagingSettings(row: Record<string, unknown>) {
  return GetAdminMessagingSettingsResponse.parse({
    emailAutoResponderActive: row.email_auto_responder_active === true,
    whatsappEnabled: row.whatsapp_enabled === true,
    whatsappWabaId: typeof row.whatsapp_waba_id === 'string' ? row.whatsapp_waba_id : null,
    whatsappPhoneNumberId: typeof row.whatsapp_phone_number_id === 'string' ? row.whatsapp_phone_number_id : null,
    whatsappTemplateName: typeof row.whatsapp_template_name === 'string' ? row.whatsapp_template_name : null,
    whatsappTemplateLanguage: typeof row.whatsapp_template_language === 'string' ? row.whatsapp_template_language : 'fr',
    whatsappValidated: typeof row.whatsapp_validated_at === 'string' && !!row.whatsapp_validated_at,
    whatsappCredentialsReady: !!Deno.env.get('WHATSAPP_ACCESS_TOKEN'),
  });
}

function whatsappRecipient(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9 && /^[2368]/.test(digits)) return `237${digits}`;
  if (digits.startsWith('237') && digits.length === 12) return digits;
  if (digits.length >= 8 && digits.length <= 15) return digits;
  return null;
}

async function sendWhatsAppConfirmation(settings: Record<string, unknown>, phone: string, name: string) {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = typeof settings.whatsapp_phone_number_id === 'string' ? settings.whatsapp_phone_number_id : '';
  const templateName = typeof settings.whatsapp_template_name === 'string' ? settings.whatsapp_template_name : '';
  const language = typeof settings.whatsapp_template_language === 'string' ? settings.whatsapp_template_language : 'fr';
  const recipient = whatsappRecipient(phone);
  if (settings.whatsapp_enabled !== true || !token || !phoneNumberId || !templateName || !recipient) {
    return { status: 'not_configured' as NotificationStatus, providerMessageId: null };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components: [{ type: 'body', parameters: [{ type: 'text', text: name.trim().slice(0, 120) || 'Bonjour' }] }],
        },
      }),
      signal: AbortSignal.timeout(8000),
    });
    const result = await response.json().catch(() => null) as { messages?: Array<{ id?: string }> } | null;
    if (!response.ok) return { status: 'failed' as NotificationStatus, providerMessageId: null };
    return { status: 'accepted' as NotificationStatus, providerMessageId: result?.messages?.[0]?.id ?? null };
  } catch {
    return { status: 'failed' as NotificationStatus, providerMessageId: null };
  }
}

async function deliverWhatsAppOnce(type: ContactType, id: string, channel: ContactChannel, consent: boolean, phone: string, name: string, settings: Record<string, unknown>) {
  const table = type === 'appointment' ? 'cabinet_appointments' : 'cabinet_contact_questions';
  if (!usesWhatsApp(channel)) return 'not_requested' as NotificationStatus;
  if (!consent) return 'not_configured' as NotificationStatus;
  if (settings.whatsapp_enabled !== true || !Deno.env.get('WHATSAPP_ACCESS_TOKEN')) {
    await db.from(table).update({ whatsapp_status: 'not_configured' }).eq('id', id);
    return 'not_configured' as NotificationStatus;
  }

  const claim = await db.from(table).update({ whatsapp_status: 'sending' })
    .eq('id', id).eq('whatsapp_status', 'pending').select('id').maybeSingle();
  if (claim.error) throw new HttpError(503, 'Le suivi de la notification WhatsApp est indisponible.');
  if (!claim.data) {
    const existing = await db.from(table).select('whatsapp_status').eq('id', id).maybeSingle();
    if (existing.error) throw new HttpError(503, 'Le suivi de la notification WhatsApp est indisponible.');
    return (existing.data?.whatsapp_status ?? 'not_configured') as NotificationStatus;
  }

  const sent = await sendWhatsAppConfirmation(settings, phone, name);
  const update = await db.from(table).update({
    whatsapp_status: sent.status,
    whatsapp_provider_message_id: sent.providerMessageId,
  }).eq('id', id).eq('whatsapp_status', 'sending');
  if (update.error) throw new HttpError(503, 'Le suivi de la notification WhatsApp est indisponible.');
  return sent.status;
}

async function validateWhatsAppSettings(settings: Record<string, unknown>) {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const wabaId = typeof settings.whatsapp_waba_id === 'string' ? settings.whatsapp_waba_id : '';
  const phoneNumberId = typeof settings.whatsapp_phone_number_id === 'string' ? settings.whatsapp_phone_number_id : '';
  const templateName = typeof settings.whatsapp_template_name === 'string' ? settings.whatsapp_template_name : '';
  const language = typeof settings.whatsapp_template_language === 'string' ? settings.whatsapp_template_language : 'fr';
  if (!token) throw new HttpError(503, 'La clé WhatsApp Cloud API doit être configurée comme secret de la fonction Supabase.');
  if (!/^\d{5,100}$/.test(wabaId) || !/^\d{5,100}$/.test(phoneNumberId) || !/^[a-z0-9_]{2,120}$/.test(templateName)) {
    return { valid: false, message: 'Renseignez un WABA ID, un Phone Number ID et le nom exact du modèle approuvé.' };
  }

  try {
    const headers = { Authorization: `Bearer ${token}` };
    const numbersUrl = new URL(`https://graph.facebook.com/v23.0/${encodeURIComponent(wabaId)}/phone_numbers`);
    numbersUrl.searchParams.set('fields', 'id');
    numbersUrl.searchParams.set('limit', '100');
    const numbersResponse = await fetch(numbersUrl, { headers, signal: AbortSignal.timeout(8000) });
    if (!numbersResponse.ok) return { valid: false, message: 'Meta n’a pas validé le WABA ID ou l’accès aux numéros WhatsApp.' };
    const numbersData = await numbersResponse.json().catch(() => null) as { data?: Array<{ id?: string }> } | null;
    if (!numbersData?.data?.some((item) => item.id === phoneNumberId)) {
      return { valid: false, message: 'Le Phone Number ID ne fait pas partie du WABA ID indiqué.' };
    }

    const phoneResponse = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(phoneNumberId)}?fields=id`, {
      headers, signal: AbortSignal.timeout(8000),
    });
    if (!phoneResponse.ok) return { valid: false, message: 'Meta n’a pas validé le Phone Number ID. Vérifiez le compte et les autorisations.' };
    const phoneData = await phoneResponse.json().catch(() => null) as { id?: string } | null;
    if (phoneData?.id !== phoneNumberId) return { valid: false, message: 'Le Phone Number ID ne correspond pas au compte configuré.' };

    const templateUrl = new URL(`https://graph.facebook.com/v23.0/${encodeURIComponent(wabaId)}/message_templates`);
    templateUrl.searchParams.set('name', templateName);
    templateUrl.searchParams.set('fields', 'name,status,language,components');
    const templateResponse = await fetch(templateUrl, { headers, signal: AbortSignal.timeout(8000) });
    if (!templateResponse.ok) return { valid: false, message: 'Meta n’a pas validé le WABA ID ou l’accès aux modèles WhatsApp.' };
    const templateData = await templateResponse.json().catch(() => null) as {
      data?: Array<{ name?: string; status?: string; language?: string; components?: Array<{ type?: string; text?: string }> }>
    } | null;
    const template = templateData?.data?.find((item) => item.name === templateName && item.language === language);
    if (!template || template.status !== 'APPROVED') {
      return { valid: false, message: 'Le modèle doit exister, avoir cette langue et être approuvé par Meta.' };
    }
    const bodyComponent = template.components?.find((component) => component.type === 'BODY');
    const placeholders = bodyComponent?.text?.match(/\{\{\s*\d+\s*\}\}/g) ?? [];
    if (placeholders.length !== 1 || !/\{\{\s*1\s*\}\}/.test(placeholders[0])) {
      return { valid: false, message: 'Le modèle doit avoir exactement une variable, {{1}}, dans son corps.' };
    }
    return { valid: true, message: 'Numéro et modèle WhatsApp approuvé validés.' };
  } catch {
    return { valid: false, message: 'Meta est temporairement inaccessible. Réessayez plus tard.' };
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
      headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,PATCH,DELETE,OPTIONS';
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
      const email = parsed.data.email?.trim().toLowerCase() || null;
      const channel = parsed.data.contactChannel as ContactChannel;
      if (!name || !phone) throw new HttpError(400, 'Le nom et le numéro de téléphone sont obligatoires.');
      if (usesEmail(channel) && !email) throw new HttpError(400, 'Une adresse e-mail est requise pour la confirmation par e-mail.');
      if (usesWhatsApp(channel) && (!parsed.data.whatsappConsent || !whatsappRecipient(phone))) {
        throw new HttpError(400, 'Un numéro WhatsApp valide et votre accord sont requis pour recevoir une confirmation.');
      }
      await checkReviewRate(request); // Shared anti-abuse quota for public submissions.
      const id = parsed.data.submissionId ?? crypto.randomUUID();
      const settings = await readMessagingSettings();
      const emailStatus: NotificationStatus = usesEmail(channel)
        ? settings.email_auto_responder_active === true ? 'pending' : 'not_configured'
        : 'not_requested';
      const whatsappStatus: NotificationStatus = usesWhatsApp(channel)
        ? settings.whatsapp_enabled === true && !!Deno.env.get('WHATSAPP_ACCESS_TOKEN') ? 'pending' : 'not_configured'
        : 'not_requested';
      const { error } = await db.from('cabinet_appointments').upsert({
        id, name, phone, email,
        service: parsed.data.service, preferred_date: parsed.data.preferredDate || null,
        preferred_window: parsed.data.preferredWindow || null,
        message: parsed.data.message?.trim() || null,
        contact_channel: channel,
        whatsapp_consent: usesWhatsApp(channel) && parsed.data.whatsappConsent,
        email_status: emailStatus,
        whatsapp_status: whatsappStatus,
      }, { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw new HttpError(503, 'Impossible d’enregistrer votre demande. Réessayez ou contactez le cabinet.');
      const { data: saved, error: readError } = await db.from('cabinet_appointments')
        .select('email_status,whatsapp_status').eq('id', id).single();
      if (readError || !saved) throw new HttpError(503, 'La demande est enregistrée, mais son suivi est indisponible.');
      const sentWhatsApp = await deliverWhatsAppOnce(
        'appointment', id, channel, parsed.data.whatsappConsent, phone, name, settings,
      );
      return respond(SubmitContactAppointmentResponse.parse({
        accepted: true, requestId: id, statusToken: await contactStatusToken('appointment', id),
        emailStatus: saved.email_status,
        whatsappStatus: sentWhatsApp,
      }));
    }
    if (request.method === 'POST' && path === '/contact/question') {
      const parsed = SubmitContactQuestionBody.safeParse(await body(request));
      if (!parsed.success) throw new HttpError(400, 'Vérifiez les informations du formulaire.');
      if (parsed.data.website?.trim()) {
        const requestId = crypto.randomUUID();
        return respond(SubmitContactQuestionResponse.parse({
          accepted: true, requestId, statusToken: await contactStatusToken('question', requestId),
          emailStatus: 'not_requested', whatsappStatus: 'not_requested',
        }), 201);
      }

      const channel = parsed.data.contactChannel as ContactChannel;
      const name = parsed.data.name?.trim() ?? '';
      const email = parsed.data.email?.trim().toLowerCase() || null;
      const phone = parsed.data.phone?.trim() || null;
      const message = parsed.data.message.trim();
      if (usesEmail(channel) && !email) throw new HttpError(400, 'Une adresse e-mail est requise pour la confirmation par e-mail.');
      if (usesWhatsApp(channel) && (!phone || !whatsappRecipient(phone) || !parsed.data.whatsappConsent)) {
        throw new HttpError(400, 'Un numéro WhatsApp valide et votre accord sont requis pour recevoir une confirmation.');
      }
      await checkReviewRate(request);
      const id = parsed.data.submissionId;
      const settings = await readMessagingSettings();
      const emailStatus: NotificationStatus = usesEmail(channel)
        ? settings.email_auto_responder_active === true ? 'pending' : 'not_configured'
        : 'not_requested';
      const whatsappStatus: NotificationStatus = usesWhatsApp(channel)
        ? settings.whatsapp_enabled === true && !!Deno.env.get('WHATSAPP_ACCESS_TOKEN') ? 'pending' : 'not_configured'
        : 'not_requested';
      const { error } = await db.from('cabinet_contact_questions').upsert({
        id, submission_id: id, name, email, phone, message, contact_channel: channel,
        whatsapp_consent: usesWhatsApp(channel) && parsed.data.whatsappConsent,
        email_status: emailStatus, whatsapp_status: whatsappStatus,
      }, { onConflict: 'submission_id', ignoreDuplicates: true });
      if (error) throw new HttpError(503, 'Impossible d’enregistrer votre question. Réessayez ou contactez le cabinet.');
      const { data: saved, error: readError } = await db.from('cabinet_contact_questions')
        .select('id,email_status,whatsapp_status').eq('submission_id', id).single();
      if (readError || !saved) throw new HttpError(503, 'La question est enregistrée, mais son suivi est indisponible.');
      const sentWhatsApp = await deliverWhatsAppOnce(
        'question', saved.id, channel, parsed.data.whatsappConsent, phone ?? '', name, settings,
      );
      return respond(SubmitContactQuestionResponse.parse({
        accepted: true, requestId: saved.id, statusToken: await contactStatusToken('question', saved.id),
        emailStatus: saved.email_status, whatsappStatus: sentWhatsApp,
      }), 201);
    }
    if (request.method === 'POST' && path === '/contact/notification-status') {
      const parsed = UpdateContactNotificationStatusBody.safeParse(await body(request));
      if (!parsed.success) throw new HttpError(400, 'Le suivi de cette notification n’a pas pu être vérifié.');
      const validToken = await validContactStatusToken(
        parsed.data.requestType, parsed.data.requestId, parsed.data.statusToken,
      );
      if (!validToken) {
        throw new HttpError(400, 'Le suivi de cette notification n’a pas pu être vérifié.');
      }
      const table = parsed.data.requestType === 'appointment' ? 'cabinet_appointments' : 'cabinet_contact_questions';
      const { error } = await db.from(table).update({ email_status: parsed.data.emailStatus })
        .eq('id', parsed.data.requestId).eq('email_status', 'pending');
      if (error) throw new HttpError(503, 'Impossible de mettre à jour le suivi de la confirmation.');
      return respond(null, 204);
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
        service: row.service, preferredDate: row.preferred_date,
        preferredWindow: row.preferred_window, message: row.message,
        contactChannel: row.contact_channel, whatsappConsent: row.whatsapp_consent,
        emailStatus: row.email_status, whatsappStatus: row.whatsapp_status,
        contactValidated: row.contact_validated, replyStatus: row.reply_status,
        createdAt: row.created_at,
      })));
    }
    if (request.method === 'PATCH' && path.startsWith('/admin/appointments/')) {
      const parsedParams = UpdateAdminAppointmentParams.safeParse({ id: path.slice('/admin/appointments/'.length) });
      const parsedBody = UpdateAdminAppointmentBody.safeParse(await body(request));
      if (!parsedParams.success || !parsedBody.success || !Object.keys(parsedBody.data).length) {
        throw new HttpError(400, 'Vérifiez la mise à jour demandée.');
      }
      const updates: Record<string, unknown> = {};
      if (parsedBody.data.contactValidated !== undefined) updates.contact_validated = parsedBody.data.contactValidated;
      if (parsedBody.data.replyStatus !== undefined) updates.reply_status = parsedBody.data.replyStatus;
      const { data, error } = await db.from('cabinet_appointments').update(updates)
        .eq('id', parsedParams.data.id).select('id').maybeSingle();
      if (error) throw new HttpError(503, 'Impossible de mettre à jour la demande.');
      if (!data) throw new HttpError(404, 'Demande introuvable.');
      return respond({ updated: true });
    }
    if (request.method === 'GET' && path === '/admin/contact-questions') {
      const { data, error } = await db.from('cabinet_contact_questions').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw new HttpError(503, 'Impossible de charger les questions.');
      return respond(GetAdminContactQuestionsResponse.parse((data ?? []).map((row) => ({
        id: row.id, name: row.name, email: row.email, phone: row.phone, message: row.message,
        contactChannel: row.contact_channel, whatsappConsent: row.whatsapp_consent,
        emailStatus: row.email_status, whatsappStatus: row.whatsapp_status,
        contactValidated: row.contact_validated, replyStatus: row.reply_status, createdAt: row.created_at,
      }))));
    }
    if (request.method === 'PATCH' && path.startsWith('/admin/contact-questions/')) {
      const parsedParams = UpdateAdminContactQuestionParams.safeParse({ id: path.slice('/admin/contact-questions/'.length) });
      const parsedBody = UpdateAdminContactQuestionBody.safeParse(await body(request));
      if (!parsedParams.success || !parsedBody.success || !Object.keys(parsedBody.data).length) {
        throw new HttpError(400, 'Vérifiez la mise à jour demandée.');
      }
      const updates: Record<string, unknown> = {};
      if (parsedBody.data.contactValidated !== undefined) updates.contact_validated = parsedBody.data.contactValidated;
      if (parsedBody.data.replyStatus !== undefined) updates.reply_status = parsedBody.data.replyStatus;
      const { data, error } = await db.from('cabinet_contact_questions').update(updates)
        .eq('id', parsedParams.data.id).select('id').maybeSingle();
      if (error) throw new HttpError(503, 'Impossible de mettre à jour la question.');
      if (!data) throw new HttpError(404, 'Question introuvable.');
      return respond({ updated: true });
    }
    if (request.method === 'DELETE' && path.startsWith('/admin/contact-questions/')) {
      const parsed = DeleteAdminContactQuestionParams.safeParse({ id: path.slice('/admin/contact-questions/'.length) });
      if (!parsed.success) throw new HttpError(400, 'Identifiant de demande invalide.');
      const { data, error } = await db.from('cabinet_contact_questions').delete()
        .eq('id', parsed.data.id).select('id').maybeSingle();
      if (error) throw new HttpError(503, 'Impossible de supprimer la question.');
      if (!data) throw new HttpError(404, 'Question introuvable.');
      return respond(null, 204);
    }
    if (request.method === 'GET' && path === '/admin/messaging-settings') {
      return respond(publicMessagingSettings(await readMessagingSettings()));
    }
    if (request.method === 'PUT' && path === '/admin/messaging-settings') {
      const parsed = UpdateAdminMessagingSettingsBody.safeParse(await body(request));
      if (!parsed.success) throw new HttpError(400, 'Vérifiez les réglages des canaux de confirmation.');
      const current = await readMessagingSettings();
      const next = parsed.data;
      const changedWhatsAppConfig =
        next.whatsappWabaId !== (current.whatsapp_waba_id ?? null)
        || next.whatsappPhoneNumberId !== (current.whatsapp_phone_number_id ?? null)
        || next.whatsappTemplateName !== (current.whatsapp_template_name ?? null)
        || next.whatsappTemplateLanguage !== (current.whatsapp_template_language ?? 'fr');
      if (next.whatsappEnabled && (changedWhatsAppConfig || !current.whatsapp_validated_at)) {
        throw new HttpError(400, 'Validez d’abord le numéro et le modèle WhatsApp avant de l’activer.');
      }
      const { data, error } = await db.from('cabinet_messaging_settings').upsert({
        id: true,
        email_auto_responder_active: next.emailAutoResponderActive,
        whatsapp_enabled: changedWhatsAppConfig ? false : next.whatsappEnabled,
        whatsapp_waba_id: next.whatsappWabaId,
        whatsapp_phone_number_id: next.whatsappPhoneNumberId,
        whatsapp_template_name: next.whatsappTemplateName,
        whatsapp_template_language: next.whatsappTemplateLanguage,
        whatsapp_validated_at: changedWhatsAppConfig ? null : current.whatsapp_validated_at,
        updated_at: new Date().toISOString(),
        updated_by: admin.userId,
      }, { onConflict: 'id' }).select('*').single();
      if (error || !data) throw new HttpError(503, 'Impossible d’enregistrer les réglages de messagerie.');
      return respond(publicMessagingSettings(data));
    }
    if (request.method === 'POST' && path === '/admin/messaging-settings/validate-whatsapp') {
      const settings = await readMessagingSettings();
      const result = ValidateAdminWhatsAppSettingsResponse.parse(await validateWhatsAppSettings(settings));
      if (result.valid) {
        const { error } = await db.from('cabinet_messaging_settings')
          .update({ whatsapp_validated_at: new Date().toISOString(), whatsapp_enabled: false, updated_at: new Date().toISOString() })
          .eq('id', true);
        if (error) throw new HttpError(503, 'La validation a réussi, mais son état n’a pas été enregistré.');
      }
      return respond(result);
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
