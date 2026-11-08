import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ContactQuestion, ContactRequestAdminUpdate } from "@workspace/api-client-react";
import { Check, Mail, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCabinetSession } from "@/components/auth-provider";
import { cmsRequest } from "@/lib/supabase";

const questionsKey = ["cabinet", "contact-questions"] as const;
const appointmentsKey = ["cabinet", "appointments"] as const;

function includesEmail(channel: "email" | "whatsapp" | "both") {
  return channel !== "whatsapp";
}

function includesWhatsApp(channel: "email" | "whatsapp" | "both") {
  return channel !== "email";
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
            ? "Réponse marquée comme envoyée. Vérifiez-la dans votre boîte mail ou WhatsApp."
            : replyStatus === "draft_opened"
              ? "Un brouillon a été ouvert. Envoyez-le dans l’application choisie, puis marquez la demande comme répondue."
              : "Choisissez un canal pour ouvrir un brouillon. La réponse est toujours envoyée manuellement."
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

export function AdminMessagingPanel() {
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
      <p className="mt-2 text-sm text-muted-foreground">
        Boîte privée du cabinet. Les demandes sont enregistrées ici; aucune confirmation automatique n’est envoyée.
        Après vérification des coordonnées, l’administrateur peut répondre manuellement par e-mail ou WhatsApp.
      </p>
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
                  {new Date(item.createdAt).toLocaleString("fr-FR")} · Contact préféré : {item.contactChannel === "both" ? "E-mail et WhatsApp" : item.contactChannel === "whatsapp" ? "WhatsApp" : "E-mail"}
                  {item.contactChannel !== "email" && item.whatsappConsent ? " · Accord WhatsApp donné" : ""}
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
