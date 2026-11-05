import { GetSiteContentResponse } from '../../../lib/api-zod/src/generated/api';

const urlFields = new Set(['imageUrl', 'logoUrl', 'videoUrl', 'mapUrl', 'bookingUrl']);
export function parseContent(input: unknown, mediaBaseUrl: string) {
  const content = GetSiteContentResponse.parse(input);
  function check(value: unknown, key = ''): void {
    if (typeof value === 'string') {
      if (value.length > 100_000) throw new Error('Un champ de texte est trop long.');
      if (urlFields.has(key) && value.trim()) {
        const url = new URL(value);
        const allowed = key === 'bookingUrl' ? ['https:', 'mailto:', 'tel:'] : ['https:'];
        if (!allowed.includes(url.protocol) || url.username || url.password) throw new Error('Un lien utilise un format non autorisé.');
        if (url.href.startsWith(mediaBaseUrl + '/') && (url.search || url.hash || url.href !== value)) throw new Error('Utilisez le lien canonique du média Supabase.');
      }
    } else if (Array.isArray(value)) {
      if (value.length > 500) throw new Error('Une collection dépasse 500 éléments.');
      const ids = value.filter((x) => x && typeof x === 'object' && 'id' in x).map((x) => x.id);
      if (new Set(ids).size !== ids.length || ids.some((id) => !String(id).trim())) throw new Error('Chaque élément doit avoir un identifiant unique non vide.');
      value.forEach((item) => check(item));
    } else if (value && typeof value === 'object') Object.entries(value).forEach(([name, item]) => check(item, name));
  }
  check(content);
  return content;
}

export function publicContent(input: unknown) {
  const content = GetSiteContentResponse.parse(input);
  const isDemonstrationReview = (review: (typeof content.testimonials)[number]) =>
    review.id.startsWith('avis-demo-');
  return {
    ...content,
    testimonials: content.testimonials.filter((review) => !isDemonstrationReview(review)),
    blogPosts: content.blogPosts.filter((p) => p.published),
    campaigns: content.campaigns.filter((c) => c.active),
  };
}

export const mimeExtensions: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm',
};
export function signatureMatches(b: Uint8Array, type: string) {
  const str = (start: number, end: number) => String.fromCharCode(...b.slice(start, end));
  switch (type) {
    case 'image/jpeg': return b[0] === 255 && b[1] === 216 && b[2] === 255;
    case 'image/png': return [...b.slice(0, 8)].join(',') === '137,80,78,71,13,10,26,10';
    case 'image/gif': return ['GIF87a', 'GIF89a'].includes(str(0, 6));
    case 'image/webp': return str(0, 4) === 'RIFF' && str(8, 12) === 'WEBP';
    case 'video/mp4': return str(4, 8) === 'ftyp';
    case 'video/webm': return [...b.slice(0, 4)].join(',') === '26,69,223,163';
    default: return false;
  }
}
