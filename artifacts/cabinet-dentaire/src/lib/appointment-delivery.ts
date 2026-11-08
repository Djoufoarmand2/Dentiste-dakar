import type {
  ContactAppointmentAccepted,
  ContactAppointmentInput,
  ContactQuestionAccepted,
  ContactQuestionInput,
  ContactNotificationStatusInputEmailStatus,
} from "@workspace/api-client-react";
import { cmsRequest } from "./supabase";

// The FormBold endpoint is public configuration, not a secret. When present,
// it takes precedence; until then the existing Web3Forms flow remains active.
const formBoldEndpoint = import.meta.env.VITE_FORMBOLD_ENDPOINT?.trim() ?? "";
const web3FormsAccessKey =
  import.meta.env.VITE_WEB3FORMS_ACCESS_KEY?.trim() ?? "";

const preferredWindowLabel = (
  window: ContactAppointmentInput["preferredWindow"],
) => {
  if (window === "weekdays") return "Lundi-vendredi · 16 h–19 h (sur rendez-vous)";
  if (window === "saturday") return "Samedi · 10 h–14 h (sur rendez-vous)";
  return "";
};

const includesEmail = (channel: ContactAppointmentInput["contactChannel"] | ContactQuestionInput["contactChannel"] | undefined) =>
  channel !== "whatsapp";

async function recordEmailStatus(
  requestId: string,
  statusToken: string | undefined,
  requestType: "appointment" | "question",
  emailStatus: ContactNotificationStatusInputEmailStatus,
) {
  if (!statusToken) return;
  try {
    await cmsRequest<void>(
      "/contact/notification-status",
      {
        method: "POST",
        body: JSON.stringify({ requestId, requestType, statusToken, emailStatus }),
        signal: AbortSignal.timeout(8000),
      },
      false,
    );
  } catch {
    // The request itself is already saved. A tracking update must never cause
    // the visitor to submit the same private details a second time.
  }
}

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
  if (includesEmail(data.contactChannel) && data.email) formData.set("email", data.email);
  formData.set("service", data.service);
  formData.set("contact_channel", data.contactChannel ?? "email");
  formData.set("whatsapp_consent", String(data.whatsappConsent === true));
  if (data.preferredDate) formData.set("preferred_date", data.preferredDate);
  if (data.preferredWindow) formData.set("preferred_window", preferredWindowLabel(data.preferredWindow));
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

  const result = (await response.json().catch(() => null)) as
    | { success?: boolean; message?: string }
    | null;
  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.message ||
        "FormBold n’a pas accepté l’envoi. Réessayez ou contactez le cabinet par téléphone.",
    );
  }

  return { accepted: true };
}

export async function submitQuickContactQuestion(
  data: Omit<ContactQuestionInput, "submissionId"> & { submissionId?: string },
): Promise<ContactQuestionAccepted & { notificationSent: boolean }> {
  const firstName = data.name?.trim() ?? "";
  const email = data.email?.trim() ?? "";
  const phone = data.phone?.trim() ?? "";
  const message = data.message.trim();
  if (
    firstName.length > 120 ||
    (includesEmail(data.contactChannel) && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))) ||
    (data.contactChannel !== "email" && (phone.length < 8 || !data.whatsappConsent)) ||
    message.length < 5 ||
    message.length > 2000
  ) {
    throw new Error("Vérifiez le canal choisi, les coordonnées et la longueur du message.");
  };

  const input: ContactQuestionInput = {
    submissionId: data.submissionId ?? crypto.randomUUID(),
    name: firstName,
    email: email || undefined,
    phone: phone || undefined,
    message,
    contactChannel: data.contactChannel,
    whatsappConsent: data.whatsappConsent === true,
    website: data.website,
  }
  const saved = await cmsRequest<ContactQuestionAccepted>(
    "/contact/question",
    { method: "POST", body: JSON.stringify(input), signal: AbortSignal.timeout(15_000) },
    false,
  );
  if (!saved.accepted || !saved.requestId) throw new Error("Le cabinet n’a pas confirmé l’enregistrement de votre question.");

  let notificationSent = false;
  let emailStatus = saved.emailStatus;
  if (formBoldEndpoint) {
    const formData = new FormData();
    formData.set("name", firstName);
    formData.set("phone", phone);
    if (includesEmail(data.contactChannel) && email) formData.set("email", email);
    formData.set("message", message);
    formData.set("subject", "Question rapide — Cabinet Sourire Serein");
    formData.set("form_type", "Question rapide");
    formData.set("contact_channel", data.contactChannel);
    formData.set("whatsapp_consent", String(data.whatsappConsent === true));
    try {
      const endpoint = validateFormBoldEndpoint(formBoldEndpoint);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
        signal: AbortSignal.timeout(15_000),
      });
      const result = (await response.json().catch(() => null)) as { success?: boolean } | null;
      if (!response.ok || result?.success === false) throw new Error("FormBold a refusé la demande.");
      notificationSent = true;
      if (emailStatus === "pending" && saved.statusToken) {
        await recordEmailStatus(saved.requestId, saved.statusToken, "question", "accepted");
        emailStatus = "accepted";
      }
    } catch {
      if (emailStatus === "pending" && saved.statusToken) {
        await recordEmailStatus(saved.requestId, saved.statusToken, "question", "failed");
        emailStatus = "failed";
      }
    }
  } else if (emailStatus === "pending" && saved.statusToken) {
    await recordEmailStatus(saved.requestId, saved.statusToken, "question", "failed");
    emailStatus = "failed";
  }

  return { ...saved, emailStatus, notificationSent };
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
        email: includesEmail(data.contactChannel) ? data.email : undefined,
        service: data.service,
        preferred_date: data.preferredDate,
        preferred_window: preferredWindowLabel(data.preferredWindow),
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
  let notificationSent = false;
  let emailStatus = saved.emailStatus;
  try {
    if (formBoldEndpoint) {
      await submitToFormBold(data, formBoldEndpoint);
      notificationSent = true;
      if (emailStatus === "pending" && saved.statusToken && saved.requestId) {
        await recordEmailStatus(saved.requestId, saved.statusToken, "appointment", "accepted");
        emailStatus = "accepted";
      }
    } else if (web3FormsAccessKey) {
      await submitToWeb3Forms(data);
      notificationSent = true;
    }
  } catch {
    notificationSent = false;
    if (emailStatus === "pending" && saved.statusToken && saved.requestId) {
      await recordEmailStatus(saved.requestId, saved.statusToken, "appointment", "failed");
      emailStatus = "failed";
    }
  }
  return { ...saved, emailStatus, notificationSent };
}
