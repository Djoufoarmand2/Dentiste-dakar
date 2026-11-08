import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ContactQuestion,
  ContactRequestAdminUpdate,
  MessagingSettings,
  MessagingSettingsInput,
} from "@workspace/api-client-react";
import { Check, Mail, MessageCircle, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCabinetSession } from "@/components/auth-provider";
import { cmsRequest } from "@/lib/supabase";

const settingsKey = ["cabinet", "messaging-settings"] as const;
const questionsKey = ["cabinet", "contact-questions"] as const;
const appointmentsKey = ["cabinet", "appointments"] as const;

const emptySettings: MessagingSettings = {
  emailAutoResponderActive: false,
  whatsappEnabled: false,
  whatsappWabaId: null,
  whatsappPhoneNumberId: null,
  whatsappTemplateName: null,
  whatsappTemplateLanguage: "fr",
  whatsappValidated: false,
  whatsappCredentialsReady: false,
};

function includesEmail(channel: "email" | "whatsapp" | "both") {
  return channel !== "whatsapp";
}

function includesWhatsApp(channel: "email" | "whatsapp" | "both") {
  return channel !== "email";
}

function statusLabel(status: string, kind: "email" | "whatsapp") {
  const labels: Record<string, string> = {
    pending: "En attente",
    sending: "Envoi en cours",
    accepted: "Accepté par le fournisseur",
    failed: "Échec",
    not_requested: "Non demandé",
    not_configured: "Canal non activé",
  };
  return `${kind === "email" ? "E-mail" : "WhatsApp"} : ${labels[status] ?? status}`;
}

export function ContactReplyActions({
  id,
  name,
  email,
  phone,
  channel,
  whatsappConsent,
  contactValidated,
  replyStatus,
  requestType,
}: {
  id: string;
  name: string;
  email: string | null | undefined;
  phone: string | null | undefined;
  channel: "email" | "whatsapp" | "both";
  whatsappConsent: boolean;
  contactValidated: boolean;
  replyStatus: "not_replied" | "draft_opened" | "replied";
  requestType: "appointment" | "question";
}) {
  const client = useQueryClient();
  const route = requestType === "appointment" ? "appointments" : "contact-questions";
  const update = useMutation({
    mutationFn: (body: ContactRequestAdminUpdate) =>
      cmsRequest(`/admin/${route}/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: appointmentsKey });
      void client.invalidateQueries({ queryKey: questionsKey });
    },
  });
  const greeting = name.trim() || "Bonjour";
  const message = `Bonjour ${greeting},\n\nMerci d’avoir contacté le Cabinet Sourire Serein. Nous avons bien reçu votre demande et vous répondrons dès que possible, au plus tard sous 24 h.\n\nCordialement,\nCabinet Sourire Serein\nDouala · +237 677 873 442\nhttps://dentiste-sourireserein.cm`;
  const digits = (phone ?? "").replace(/\D/g, "");
  const whatsappNumber = digits.length === 9 ? `237${digits}` : digits;
  const gmailUrl = email
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent("Votre demande — Cabinet Sourire Serein")}&body=${encodeURIComponent(message)}`
    : "";
  const whatsappUrl = whatsappNumber.length >= 8
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    : "";
  const canUseEmail = contactValidated && includesEmail(channel) && !!email;
  const canUseWhatsApp = contactValidated && includesWhatsApp(channel) && whatsappConsent && !!whatsappUrl;

  return (
    <div className="mt-4 rounded-xl border border-[#18365f]/10 bg-[#fbfaf7] p-4">
      <label className="flex items-start gap-3 text-sm font-medium text-[#18365f]">
        <input
          type="checkbox"
          checked={contactValidated}
          onChange={(event) => update.mutate({ contactValidated: event.target.checked })}
          className="mt-1 accent-[#18365f]"
          disabled={update.isPending}
          data-testid={`checkbox-contact-validated-${id}`}
        />
        <span>Coordonnées vérifiées par l’administrateur</span>
      </label>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {contactValidated
          ? replyStatus === "replied"
            ? "Réponse marquée comme envoyée. Vérifiez l’envoi dans votre boîte ou WhatsApp."
            : replyStatus === "draft_opened"
              ? "Un brouillon a été ouvert. Envoyez-le dans Gmail ou WhatsApp, puis marquez la demande comme répondue."
              : "Choisissez un canal pour ouvrir un brouillon prérempli. L’envoi doit être confirmé dans l’application."
          : "Les liens de réponse restent désactivés jusqu’à la vérification des coordonnées."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {canUseEmail && (
          <a
            href={gmailUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => update.mutate({ replyStatus: "draft_opened" })}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#18365f]/20 bg-white px-3 text-xs font-semibold text-[#18365f] transition hover:-translate-y-0.5 hover:border-[#18365f] hover:shadow-md"
            data-testid={`link-reply-gmail-${id}`}
          >
            <Mail size={15} aria-hidden="true" /> Répondre dans Gmail
          </a>
        )}
        {canUseWhatsApp && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => update.mutate({ replyStatus: "draft_opened" })}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-700/20 bg-white px-3 text-xs font-semibold text-emerald-800 transition hover:-translate-y-0.5 hover:border-emerald-700 hover:shadow-md"
            data-testid={`link-reply-whatsapp-${id}`}
          >
            <MessageCircle size={15} aria-hidden="true" /> Répondre sur WhatsApp
          </a>
        )}
        {contactValidated && replyStatus !== "replied" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={update.isPending}
            onClick={() => update.mutate({ replyStatus: "replied" })}
            data-testid={`button-mark-replied-${id}`}
          >
            <Check size={14} className="mr-1" /> Marquer comme répondu
          </Button>
        )}
      </div>
      {update.error && <p role="alert" className="mt-2 text-xs text-red-700">{update.error.message}</p>}
    </div>
  );
}

function AdminMessagingSettingsPanel() {
  const { session } = useCabinetSession();
  const client = useQueryClient();
  const settings = useQuery({
    queryKey: [...settingsKey, session?.user.id],
    queryFn: () => cmsRequest<MessagingSettings>("/admin/messaging-settings"),
    enabled: !!session,
    retry: false,
  });
  const [draft, setDraft] = useState<MessagingSettingsInput>({
    emailAutoResponderActive: emptySettings.emailAutoResponderActive,
    whatsappEnabled: emptySettings.whatsappEnabled,
    whatsappWabaId: null,
    whatsappPhoneNumberId: null,
    whatsappTemplateName: null,
    whatsappTemplateLanguage: "fr",
  });
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    if (!settings.data) return;
    setDraft({
      emailAutoResponderActive: settings.data.emailAutoResponderActive,
      whatsappEnabled: settings.data.whatsappEnabled,
      whatsappWabaId: settings.data.whatsappWabaId,
      whatsappPhoneNumberId: settings.data.whatsappPhoneNumberId,
      whatsappTemplateName: settings.data.whatsappTemplateName,
      whatsappTemplateLanguage: settings.data.whatsappTemplateLanguage,
    });
  }, [settings.data]);

  const save = useMutation({
    mutationFn: (payload: MessagingSettingsInput) =>
      cmsRequest<MessagingSettings>("/admin/messaging-settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: (result) => {
      setValidationMessage("");
      setDraft({
        emailAutoResponderActive: result.emailAutoResponderActive,
        whatsappEnabled: result.whatsappEnabled,
        whatsappWabaId: result.whatsappWabaId,
        whatsappPhoneNumberId: result.whatsappPhoneNumberId,
        whatsappTemplateName: result.whatsappTemplateName,
        whatsappTemplateLanguage: result.whatsappTemplateLanguage,
      });
      void client.invalidateQueries({ queryKey: settingsKey });
    },
  });
  const validateWhatsApp = useMutation({
    mutationFn: () => cmsRequest<{ valid: boolean; message: string }>(
      "/admin/messaging-settings/validate-whatsapp",
      { method: "POST" },
    ),
    onSuccess: (result) => {
      setValidationMessage(result.message);
      void client.invalidateQueries({ queryKey: settingsKey });
    },
  });

  const saved = settings.data ?? emptySettings;
  const configChanged =
    draft.whatsappWabaId !== saved.whatsappWabaId
    || draft.whatsappPhoneNumberId !== saved.whatsappPhoneNumberId
    || draft.whatsappTemplateName !== saved.whatsappTemplateName
    || draft.whatsappTemplateLanguage !== saved.whatsappTemplateLanguage;
  const whatsappValidated = saved.whatsappValidated && !configChanged;
  const setField = <K extends keyof MessagingSettingsInput>(key: K, value: MessagingSettingsInput[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <section className="mb-8 rounded-2xl border bg-white p-6" aria-labelledby="messaging-settings-title">
      <h2 id="messaging-settings-title" className="font-display text-xl text-[#18365f]">Confirmations automatiques</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Les canaux restent inactifs tant qu’ils n’ont pas été configurés et vérifiés. Les confirmations ne reprennent jamais le contenu médical du message.
      </p>
      {settings.isLoading && <p role="status" className="mt-4 text-sm">Chargement des réglages…</p>}
      {settings.error && <p role="alert" className="mt-4 text-sm text-red-700">{settings.error.message}</p>}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-[#18365f]/10 bg-[#fbfaf7] p-5">
          <h3 className="font-semibold text-[#18365f]">Confirmation par e-mail</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Dans FormBold, activez « Auto Responder » (Premium ou Business), utilisez un champ `email`, ajoutez le texte ci-dessous et téléversez le logo dans Email Branding. Cochez ensuite cette option et enregistrez.
          </p>
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={draft.emailAutoResponderActive}
              onChange={(event) => setField("emailAutoResponderActive", event.target.checked)}
              className="mt-1 accent-[#18365f]"
              data-testid="checkbox-email-autoresponder-active"
            />
            <span>J’ai activé et vérifié l’auto-répondeur FormBold.</span>
          </label>
          <p className="mt-3 rounded-lg bg-white p-3 text-xs leading-5 text-[#18365f]">
            « Bonjour, nous avons bien reçu votre demande auprès du Cabinet Sourire Serein. Notre équipe vous répondra sous 24 h. Ce message ne confirme pas un rendez-vous. »
          </p>
          <a className="mt-3 inline-flex text-xs font-semibold text-[#18365f] underline underline-offset-4" href="https://formbold.com" target="_blank" rel="noreferrer">
            Ouvrir FormBold
          </a>
        </div>

        <div className="rounded-xl border border-[#18365f]/10 bg-[#fbfaf7] p-5">
          <h3 className="font-semibold text-[#18365f]">Confirmation WhatsApp</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Créez dans Meta un modèle de message approuvé, en français ou en anglais, avec une seule variable {"{{1}}"} dans le corps. Les demandes WhatsApp sont envoyées uniquement après consentement.
          </p>
          <p className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${saved.whatsappCredentialsReady ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
            <ShieldCheck size={14} aria-hidden="true" />
            {saved.whatsappCredentialsReady ? "Secret Supabase détecté" : "Clé Meta absente du backend Supabase"}
          </p>
          {!saved.whatsappCredentialsReady && (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Ajoutez `WHATSAPP_ACCESS_TOKEN` dans Supabase → Edge Functions → Secrets. Ne saisissez jamais cette clé dans ce formulaire ni dans le code du site. La connexion WhatsApp de Replit ne peut pas être utilisée par le backend public Supabase.
            </p>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([
              ["whatsappWabaId", "WABA ID", "Identifiant du compte WhatsApp"],
              ["whatsappPhoneNumberId", "Phone Number ID", "Identifiant du numéro expéditeur"],
              ["whatsappTemplateName", "Nom du modèle", "ex. confirmation_demande"],
              ["whatsappTemplateLanguage", "Langue du modèle", "fr ou en"],
            ] as const).map(([key, label, placeholder]) => (
              <label key={key} className="block text-xs font-medium text-[#18365f]">
                {label}
                <input
                  value={draft[key] ?? ""}
                  onChange={(event) => setField(key, event.target.value || null)}
                  placeholder={placeholder}
                  maxLength={key === "whatsappTemplateName" ? 120 : 100}
                  className="editor-input mt-1"
                  data-testid={`input-${key}`}
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending || !draft.whatsappWabaId || !draft.whatsappPhoneNumberId || !draft.whatsappTemplateName || !saved.whatsappCredentialsReady}
              onClick={async () => {
                if (configChanged) await save.mutateAsync(draft);
                validateWhatsApp.mutate();
              }}
              data-testid="button-validate-whatsapp"
            >
              Vérifier avec Meta
            </Button>
            <label className={`inline-flex items-center gap-2 text-sm ${whatsappValidated ? "text-[#18365f]" : "text-muted-foreground"}`}>
              <input
                type="checkbox"
                checked={draft.whatsappEnabled}
                disabled={!whatsappValidated}
                onChange={(event) => setField("whatsappEnabled", event.target.checked)}
                className="accent-[#18365f]"
                data-testid="checkbox-whatsapp-enabled"
              />
              Activer après validation
            </label>
          </div>
          {(validationMessage || validateWhatsApp.error) && (
            <p role={validateWhatsApp.error ? "alert" : "status"} className={`mt-3 text-xs leading-5 ${validateWhatsApp.error ? "text-red-700" : "text-[#18365f]"}`}>
              {validateWhatsApp.error?.message ?? validationMessage}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={save.isPending || settings.isLoading}
          onClick={() => save.mutate(draft)}
          data-testid="button-save-messaging-settings"
        >
          {save.isPending ? "Enregistrement…" : "Enregistrer les réglages"}
        </Button>
        {save.error && <p role="alert" className="text-sm text-red-700">{save.error.message}</p>}
        {save.isSuccess && <p role="status" className="text-sm text-emerald-800">Réglages enregistrés.</p>}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Les demandes déjà reçues ne déclenchent pas de nouvel envoi lorsque vous activez un canal. Pour WhatsApp, « accepté » signifie que Meta a pris en charge le message; seul un webhook de statut peut confirmer sa livraison.
      </p>
    </section>
  );
}

function AdminContactQuestionsPanel() {
  const { session } = useCabinetSession();
  const client = useQueryClient();
  const requests = useQuery({
    queryKey: [...questionsKey, session?.user.id],
    queryFn: () => cmsRequest<ContactQuestion[]>("/admin/contact-questions"),
    enabled: !!session,
    refetchInterval: 30_000,
    staleTime: 0,
    retry: false,
  });
  const remove = useMutation({
    mutationFn: (id: string) => cmsRequest<void>(`/admin/contact-questions/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: questionsKey }),
  });

  return (
    <section className="mb-8 rounded-2xl border bg-white p-6" aria-labelledby="contact-questions-title">
      <h2 id="contact-questions-title" className="text-xl font-semibold">Questions rapides reçues</h2>
      <p className="mt-2 text-sm text-muted-foreground">Boîte privée du cabinet. Vérifiez les coordonnées avant d’ouvrir un brouillon; la réponse doit être envoyée dans Gmail ou WhatsApp.</p>
      {requests.isLoading && <p role="status" className="mt-4">Chargement des questions…</p>}
      {requests.error && <p role="alert" className="mt-4 text-red-700">{requests.error.message}</p>}
      {remove.error && <p role="alert" className="mt-4 text-red-700">{remove.error.message}</p>}
      {requests.data?.length === 0 && <p className="mt-4 text-sm">Aucune question enregistrée.</p>}
      <div className="mt-4 grid gap-3">
        {requests.data?.map((item) => (
          <article key={item.id} className="rounded-xl border p-4" data-testid={`contact-question-${item.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold">{item.name || "Visiteur"} · Question rapide</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString("fr-FR")} · Canal choisi : {item.contactChannel === "both" ? "E-mail et WhatsApp" : item.contactChannel === "whatsapp" ? "WhatsApp" : "E-mail"}
                </p>
                <p className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#edf2ff] px-2.5 py-1 text-[11px]">{statusLabel(item.emailStatus, "email")}</span>
                  <span className="rounded-full bg-[#edf2ff] px-2.5 py-1 text-[11px]">{statusLabel(item.whatsappStatus, "whatsapp")}</span>
                </p>
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {item.email && <a className="underline underline-offset-2" href={`mailto:${item.email}`}>{item.email}</a>}
                  {item.phone && <a className="underline underline-offset-2" href={`tel:${item.phone.replace(/[^\d+]/g, "")}`}>{item.phone}</a>}
                </p>
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-[#fbfaf7] p-3 text-sm leading-6">{item.message}</p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={remove.isPending}
                onClick={() => {
                  if (window.confirm("Supprimer définitivement cette question et ses coordonnées ?")) remove.mutate(item.id);
                }}
                aria-label="Supprimer cette question"
                data-testid={`button-delete-question-${item.id}`}
              >
                <Trash2 size={14} className="mr-1" /> Supprimer
              </Button>
            </div>
            <ContactReplyActions
              id={item.id}
              name={item.name}
              email={item.email}
              phone={item.phone}
              channel={item.contactChannel}
              whatsappConsent={item.whatsappConsent}
              contactValidated={item.contactValidated}
              replyStatus={item.replyStatus}
              requestType="question"
            />
          </article>
        ))}
      </div>
    </section>
  );
}

export function AdminMessagingPanel() {
  return (
    <>
      <AdminMessagingSettingsPanel />
      <AdminContactQuestionsPanel />
    </>
  );
}
