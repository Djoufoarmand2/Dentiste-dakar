export const PRACTICE_CONTACT_EMAIL = "bienveillanceclinique4@dentiste-sourireserein.cm";

export function replaceLegacyPracticeEmail(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(
      /bienveillanceclinique4@(gmail\.com|cabinet-sourireserein\.com)/gi,
      PRACTICE_CONTACT_EMAIL,
    );
  }
  if (Array.isArray(value)) return value.map(replaceLegacyPracticeEmail);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, replaceLegacyPracticeEmail(entry)]),
    );
  }
  return value;
}
