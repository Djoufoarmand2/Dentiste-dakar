const FALLBACK_CLINIC_PHONE = '+237 677 873 442';
const LEGACY_PHONE_PATTERN = /(^|[^\d])(?:(?:\+|00)?237[\s().-]*)?677[\s().-]*(?:873[\s().-]*442|87[\s().-]*34[\s().-]*42)(?!\d)/g;

export function normalizeClinicPhone(phone?: string | null): string {
  let digits = phone?.replace(/\D/g, '') ?? '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9) digits = `237${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : '';
}

export function formatClinicPhone(phone?: string | null): string {
  const raw = phone?.trim() || FALLBACK_CLINIC_PHONE;
  const digits = normalizeClinicPhone(raw);
  if (!digits) return raw;
  const local = digits.startsWith('237') && digits.length === 12 ? digits.slice(3) : '';
  if (local) return `+237 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  if (digits.length === 12 && !raw.startsWith('+') && !raw.startsWith('00')) return `+${digits}`;
  return raw;
}

export function clinicPhoneLink(phone?: string | null): string {
  const digits = normalizeClinicPhone(phone || FALLBACK_CLINIC_PHONE);
  return digits ? `tel:+${digits}` : '';
}

export function clinicWhatsAppLink(phone?: string | null, message?: string): string {
  const digits = normalizeClinicPhone(phone || FALLBACK_CLINIC_PHONE);
  if (!digits) return '';
  const suffix = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${suffix}`;
}

export function isValidClinicPhone(phone?: string | null): boolean {
  const digits = normalizeClinicPhone(phone);
  return digits.length >= 8 && digits.length <= 15 && digits !== '237670000000';
}

function replaceLegacyPhoneInText(value: string, phone: string): string {
  const formattedPhone = formatClinicPhone(phone);
  return value
    .split(/(https?:\/\/[^\s<>"']+|tel:[^\s<>"']+)/gi)
    .map((part) => /^(https?:\/\/|tel:)/i.test(part)
      ? part
      : part.replace(LEGACY_PHONE_PATTERN, (_match, prefix: string) => `${prefix}${formattedPhone}`))
    .join('');
}

export function applyClinicPhoneToContent<T>(content: T, phone?: string | null): T {
  const currentPhone = phone?.trim() || FALLBACK_CLINIC_PHONE;
  const visit = (value: unknown): unknown => {
    if (typeof value === 'string') return replaceLegacyPhoneInText(value, currentPhone);
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, visit(entry)]));
    }
    return value;
  };
  return visit(content) as T;
}
