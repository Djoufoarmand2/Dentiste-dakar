import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PublishAdminContentBody } from '../../lib/api-zod/src/generated/api.ts';
import { isValidCampaignPublicationDate, normalizeCampaignPublicationDate } from '../../artifacts/cabinet-dentaire/src/lib/campaign-dates.ts';
import { normalizePublicationInput, parseContent } from '../../supabase/functions/cabinet-api/validation.ts';

const html = await readFile(new URL('../../artifacts/cabinet-dentaire/dist/public/index.html', import.meta.url), 'utf8');
const snapshot = html.match(/<script id="cabinet-public-content" type="application\/json">([\s\S]*?)<\/script>/);
assert.ok(snapshot, 'Build the public pages before running this test');
const content = JSON.parse(snapshot[1]);
assert.ok(content.campaigns.length, 'The fixture must contain a campaign');
const activeVideos = content.campaigns.filter((campaign) => campaign.mediaType === 'video' && campaign.active);
assert.ok(activeVideos.length, 'The fixture must contain an active video');
const publicationContent = structuredClone(content);
for (const campaign of publicationContent.campaigns) {
  if (campaign.mediaType === 'video' && campaign.active) campaign.publishedAt = '2026-05-01T00:00:00.000Z';
}
const publication = { content: publicationContent, expectedVersion: 1 };
const videoToTest = publication.content.campaigns.find((campaign) => campaign.mediaType === 'video' && campaign.active);
videoToTest.publishedAt = '';
assert.equal(PublishAdminContentBody.safeParse(publication).success, false, 'Raw empty date values are rejected by the API contract');
const normalizedMissingDate = normalizePublicationInput(publication);
assert.equal(PublishAdminContentBody.safeParse(normalizedMissingDate).success, true, 'Blank optional values remain contract-compatible');
assert.throws(
  () => parseContent(normalizedMissingDate.content, 'https://example.invalid/media'),
  /date originale de mise en ligne YouTube est obligatoire/i,
  'Active videos cannot be published without their original upload date',
);
assert.equal(videoToTest.publishedAt, '', 'Normalization must not mutate the original draft');
videoToTest.publishedAt = 'not-a-date';
assert.equal(PublishAdminContentBody.safeParse(normalizePublicationInput(publication)).success, false);
videoToTest.publishedAt = '2026-05-01T00:00:00.000Z';
assert.equal(PublishAdminContentBody.safeParse(normalizePublicationInput(publication)).success, true);
assert.doesNotThrow(
  () => parseContent(normalizePublicationInput(publication).content, 'https://example.invalid/media'),
  'An active video with a valid upload date is accepted',
);
const inactiveContent = structuredClone(content);
const inactiveVideo = inactiveContent.campaigns.find((campaign) => campaign.mediaType === 'video');
inactiveVideo.active = false;
inactiveVideo.publishedAt = '';
assert.doesNotThrow(
  () => parseContent(normalizePublicationInput({ ...publication, content: inactiveContent }).content, 'https://example.invalid/media'),
  'An inactive video draft may be saved before its publication date is known',
);
assert.equal(PublishAdminContentBody.safeParse(normalizePublicationInput({ content })).success, false, 'Version is still required');
const informationHtml = await readFile(new URL('../../artifacts/cabinet-dentaire/dist/public/informations/index.html', import.meta.url), 'utf8');
const videoJsonLd = [...informationHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((match) => JSON.parse(match[1]))
  .flatMap((block) => block['@graph'] || [])
  .filter((item) => item['@type'] === 'VideoObject');
assert.equal(
  videoJsonLd.length,
  activeVideos.length,
  'Every active video campaign with its required original date must be represented in VideoObject data',
);
assert.equal(
  videoJsonLd.every((video) => typeof video.uploadDate === 'string' && !Number.isNaN(Date.parse(video.uploadDate))),
  true,
  'Every emitted VideoObject must include a valid uploadDate',
);
assert.equal(normalizeCampaignPublicationDate('2026-05-01'), '2026-05-01T00:00:00.000Z');
assert.equal(isValidCampaignPublicationDate('2026-05-01'), true);
assert.equal(isValidCampaignPublicationDate('2026-02-30'), false);
console.log('PASS: active-video date validation, inactive drafts, date normalization, version requirement, and complete VideoObject markup.');
