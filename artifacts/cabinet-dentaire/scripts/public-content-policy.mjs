const removedServiceIds = new Set([
  'kinesitherapie-maxillo-faciale',
  'maxillofacial-physiotherapy',
]);

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const isRemovedService = (service) => {
  const values = [service.id, service.slug, service.slugEn, service.title, service.titleEn].map(normalize);
  return values.some((value) => removedServiceIds.has(value))
    || values.some((value) => /kinesitherapie|maxillofacial-physiotherapy/.test(value));
};

const removeTreatmentMention = (text, locale) => {
  if (typeof text !== 'string') return text;
  const pattern = locale === 'fr'
    ? /(?:,\s*|\s+(?:et|ou)\s+)(?:la\s+)?kin[eé]sith[eé]rapie(?:\s+dentaire)?(?:\s*(?:et|\/)\s*maxillo-faciale|\s+maxillo-faciale)?/gi
    : /(?:,\s*|\s+and\s+)(?:dental\s*\/\s*)?maxillofacial physiotherapy/gi;
  return text
    .replace(pattern, '')
    .replace(/,\s*,/g, ',')
    .replace(/\s+([,.;!?])/g, '$1');
};

export function filterRemovedServiceFromPublicContent(content) {
  return {
    ...content,
    services: (content.services || []).filter((service) => !isRemovedService(service)),
    gallery: (content.gallery || []).filter((item) => normalize(item.id) !== 'illustration-kinesitherapie-maxillo-faciale'),
    faqs: (content.faqs || []).map((faq) => ({
      ...faq,
      answer: removeTreatmentMention(faq.answer, 'fr'),
      answerEn: removeTreatmentMention(faq.answerEn, 'en'),
    })),
  };
}
