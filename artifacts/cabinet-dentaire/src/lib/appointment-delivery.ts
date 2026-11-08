import type {
  ContactAppointmentAccepted,
  ContactAppointmentInput,
  ContactQuestionAccepted,
  ContactQuestionInput,
} from "@workspace/api-client-react";
import { cmsRequest } from "./supabase";

const includesEmail = (
  channel: ContactAppointmentInput["contactChannel"] | ContactQuestionInput["contactChannel"],
) => channel !== "whatsapp";

const includesWhatsApp = (
  channel: ContactAppointmentInput["contactChannel"] | ContactQuestionInput["contactChannel"],
) => channel !== "email";

export const appointmentProviderDisclosure =
  "Lorsque les confirmations sont activées, elles sont envoyées directement par l’API Gmail et/ou l’API WhatsApp Business de Meta, sans outil d’automatisation externe.";

export async function submitQuickContactQuestion(
  data: Omit<ContactQuestionInput, "submissionId"> & { submissionId?: string },
): Promise<ContactQuestionAccepted> {
  const name = data.name?.trim() ?? "";
  const email = data.email?.trim() ?? "";
  const phone = data.phone?.trim() ?? "";
  const message = data.message.trim();

  if (
    name.length > 120
    || (includesEmail(data.contactChannel) && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)))
    || (includesWhatsApp(data.contactChannel) && (phone.length < 8 || data.whatsappConsent !== true))
    || message.length < 5
    || message.length > 2000
  ) {
    throw new Error("Vérifiez le canal choisi, les coordonnées et la longueur du message.");
  }

  const input: ContactQuestionInput = {
    submissionId: data.submissionId ?? crypto.randomUUID(),
    name,
    email: email || undefined,
    phone: phone || undefined,
    message,
    contactChannel: data.contactChannel,
    whatsappConsent: data.whatsappConsent === true,
    website: data.website,
  };
  const saved = await cmsRequest<ContactQuestionAccepted>(
    "/contact/question",
    {
      method: "POST",
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(25_000),
    },
    false,
  );
  if (!saved.accepted || !saved.requestId) {
    throw new Error("Le cabinet n’a pas confirmé l’enregistrement de votre question.");
  }
  return saved;
}

export async function submitAppointmentRequest(
  data: ContactAppointmentInput,
): Promise<ContactAppointmentAccepted> {
  if (data.website?.trim()) return { accepted: true };

  const saved = await cmsRequest<ContactAppointmentAccepted>(
    "/contact/appointment",
    {
      method: "POST",
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(25_000),
    },
    false,
  );
  if (!saved.accepted || !saved.requestId) {
    throw new Error("Le cabinet n’a pas confirmé l’enregistrement de votre demande.");
  }
  return saved;
}
