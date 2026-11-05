import type {
  ContactAppointmentAccepted,
  ContactAppointmentInput,
} from "@workspace/api-client-react";
import { cmsRequest } from "./supabase";

// The FormBold endpoint is public configuration, not a secret. When present,
// it takes precedence; until then the existing Web3Forms flow remains active.
const formBoldEndpoint = import.meta.env.VITE_FORMBOLD_ENDPOINT?.trim() ?? "";
const web3FormsAccessKey =
  import.meta.env.VITE_WEB3FORMS_ACCESS_KEY?.trim() ?? "";

export const appointmentProviderName = formBoldEndpoint
  ? "FormBold"
  : web3FormsAccessKey
    ? "Web3Forms"
    : null;

export const appointmentProviderDisclosure = appointmentProviderName
  ? `Les demandes sont conservées dans Supabase; une notification est envoyée via ${appointmentProviderName}.`
  : "Les demandes sont conservées dans Supabase et consultables par le cabinet.";

function validateFormBoldEndpoint(endpoint: string): string {
  let url: URL;

  try {
    url = new URL(endpoint);
  } catch {
    throw new Error(
      "L’URL FormBold est invalide. Utilisez l’adresse copiée depuis l’onglet Form Setup.",
    );
  }

  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== "formbold.com" ||
    !/^\/s\/[A-Za-z0-9_-]+\/?$/.test(url.pathname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "L’URL FormBold doit être au format https://formbold.com/s/ID.",
    );
  }

  return url.toString();
}

async function submitToFormBold(
  data: ContactAppointmentInput,
  configuredEndpoint: string,
): Promise<ContactAppointmentAccepted> {
  const endpoint = validateFormBoldEndpoint(configuredEndpoint);
  const formData = new FormData();
  formData.set("name", data.name);
  formData.set("phone", data.phone);
  formData.set("email", data.email);
  formData.set("service", data.service);
  if (data.preferredDate) formData.set("preferred_date", data.preferredDate);
  if (data.message) formData.set("message", data.message);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error(
      "FormBold est temporairement inaccessible. Réessayez ou contactez le cabinet par téléphone.",
    );
  }

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(
      result?.message ||
        "FormBold n’a pas accepté l’envoi. Réessayez ou contactez le cabinet par téléphone.",
    );
  }

  return { accepted: true };
}

async function submitToWeb3Forms(
  data: ContactAppointmentInput,
): Promise<ContactAppointmentAccepted> {
  if (!web3FormsAccessKey) {
    throw new Error(
      "Le formulaire en ligne n’est pas configuré. Contactez le cabinet par téléphone.",
    );
  }

  let response: Response;
  try {
    response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        access_key: web3FormsAccessKey,
        subject: "Nouvelle demande de rendez-vous - Cabinet dentaire",
        from_name: "Site Web Cabinet Dentaire",
        name: data.name,
        phone: data.phone,
        email: data.email,
        service: data.service,
        preferred_date: data.preferredDate,
        message: data.message,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error(
      "Le service de demande est temporairement indisponible. Réessayez.",
    );
  }

  const result = (await response.json().catch(() => null)) as
    | { success?: boolean }
    | null;
  if (!response.ok || result?.success !== true) {
    throw new Error(
      "L’envoi a échoué. Réessayez ou contactez le cabinet par téléphone.",
    );
  }

  return { accepted: true };
}

export async function submitAppointmentRequest(
  data: ContactAppointmentInput,
): Promise<ContactAppointmentAccepted> {
  if (data.website?.trim()) return { accepted: true };
  const saved = await cmsRequest<ContactAppointmentAccepted>(
    "/contact/appointment",
    { method: "POST", body: JSON.stringify(data), signal: AbortSignal.timeout(15_000) },
    false,
  );
  if (!saved.accepted || !saved.requestId) throw new Error("Le cabinet n’a pas confirmé l’enregistrement.");
  // Storage is authoritative: a failed email must never hide a saved request
  // or encourage resubmitting the same patient data.
  try {
    if (formBoldEndpoint) await submitToFormBold(data, formBoldEndpoint);
    else await submitToWeb3Forms(data);
    return { ...saved, notificationSent: true };
  } catch {
    return { ...saved, notificationSent: false };
  }
}
