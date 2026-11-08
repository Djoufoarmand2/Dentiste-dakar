import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { submitQuickContactQuestion } from "@/lib/appointment-delivery";
import { ManualContactLinks } from "@/components/manual-contact-links";
import { useSiteLocale } from "@/lib/site-locale";

export function QuickContactForm({
  phone = "+237 677 87 34 42",
  email,
}: {
  phone?: string;
  email?: string;
}) {
  const locale = useSiteLocale();
  const en = locale === "en";
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [channel, setChannel] = useState<"email" | "whatsapp" | "both">("email");
  const submissionId = useRef<string | null>(null);
  const phoneLink = phone.replace(/[^\d+]/g, "");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // The submit event covers both the button click and Enter; the backend saves
    // the request for the practice to review and answer manually.
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const firstName = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const mobile = String(data.get("phone") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const contactChannel = String(data.get("contactChannel") ?? "email") as "email" | "whatsapp" | "both";
    const whatsappConsent = data.get("whatsappConsent") === "on";

    if (String(data.get("website") ?? "").trim()) {
      // Quietly absorb bot submissions that fill the visually hidden field.
      formRef.current?.reset();
      setStatus("success");
      return;
    }

    if ((contactChannel !== "whatsapp" && !email) || (contactChannel !== "email" && (!mobile || !whatsappConsent)) || message.length < 5) {
      setErrorMessage(en
        ? "Check the selected contact method and the required details."
        : "Vérifiez le moyen de contact choisi et les coordonnées requises.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setErrorMessage("");
    try {
      const result = await submitQuickContactQuestion({
        submissionId: submissionId.current ?? (submissionId.current = crypto.randomUUID()),
        name: firstName,
        email: email || undefined,
        phone: mobile || undefined,
        message,
        contactChannel,
        whatsappConsent,
      });
      formRef.current?.reset();
      submissionId.current = null;
      setChannel("email");
      setStatus("success");
    } catch (error) {
      setErrorMessage(
        en
          ? "We could not send your message. Please try again or call the practice."
          : error instanceof Error
            ? error.message
            : "L’envoi n’a pas abouti. Réessayez ou appelez le cabinet.",
      );
      setStatus("error");
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="relative mt-5 space-y-5 overflow-hidden rounded-md border border-[#073e53]/10 bg-[#fbfaf7] p-6 pt-8 shadow-[0_10px_35px_rgba(24,54,95,.06)] md:p-8 md:pt-9"
      data-testid="form-quick-contact"
    >
      <span aria-hidden="true" className="absolute left-0 top-0 h-[3px] w-10 bg-[#b5965a]" />

      <div
        aria-hidden="true"
        className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
      >
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="block text-[10px] font-semibold uppercase tracking-[.13em] text-[#536174]">
        {en ? "First name" : "Prénom"}
        <input
          name="name"
          type="text"
          autoComplete="given-name"
          maxLength={120}
          className="mt-2 block h-12 w-full rounded-md border border-[#e3dfd5] bg-white px-4 text-sm normal-case tracking-normal text-[#18365f] outline-none transition focus:border-[#b5965a] focus:ring-2 focus:ring-[#b5965a]/15"
          placeholder={en ? "Your first name" : "Votre prénom"}
          data-testid="input-quick-contact-name"
        />
      </label>

      <label className="block text-[10px] font-semibold uppercase tracking-[.13em] text-[#536174]">
        {en ? `Email address${channel !== "whatsapp" ? " *" : ""}` : `Adresse e-mail${channel !== "whatsapp" ? " *" : ""}`}
        <input
          name="email"
          type="email"
          autoComplete="email"
          required={channel !== "whatsapp"}
          maxLength={254}
          className="mt-2 block h-12 w-full rounded-md border border-[#e3dfd5] bg-white px-4 text-sm normal-case tracking-normal text-[#18365f] outline-none transition focus:border-[#b5965a] focus:ring-2 focus:ring-[#b5965a]/15"
          placeholder={en ? "you@example.com" : "vous@exemple.com"}
          data-testid="input-quick-contact-email"
        />
      </label>

      <fieldset>
        <legend className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#536174]">
          {en ? "How may the practice contact you?" : "Comment le cabinet peut-il vous recontacter ?"}
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {([
            ["email", en ? "Email" : "E-mail"],
            ["whatsapp", "WhatsApp"],
            ["both", en ? "Both" : "Les deux"],
          ] as const).map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input
                className="peer sr-only"
                type="radio"
                name="contactChannel"
                value={value}
                checked={channel === value}
                onChange={() => setChannel(value)}
              />
              <span className="flex min-h-11 items-center justify-center rounded-md border border-[#e3dfd5] bg-white px-3 text-sm font-medium text-[#18365f] transition peer-checked:border-[#18365f] peer-checked:bg-[#edf2ff] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#b5965a]">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {channel !== "email" && (
        <>
          <label className="block text-[10px] font-semibold uppercase tracking-[.13em] text-[#536174]">
            {en ? "WhatsApp number *" : "Numéro WhatsApp *"}
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={40}
              className="mt-2 block h-12 w-full rounded-md border border-[#e3dfd5] bg-white px-4 text-sm normal-case tracking-normal text-[#18365f] outline-none transition focus:border-[#b5965a] focus:ring-2 focus:ring-[#b5965a]/15"
              placeholder="+237 6XX XX XX XX"
            />
          </label>
          <label className="flex items-start gap-3 text-xs leading-5 text-[#536174]">
            <input name="whatsappConsent" type="checkbox" required className="mt-1 accent-[#18365f]" />
            <span>
              {en
                ? "I agree to be contacted on WhatsApp about this request. No marketing messages."
                : "J’accepte d’être recontacté sur WhatsApp au sujet de cette demande. Aucun message publicitaire."}
            </span>
          </label>
        </>
      )}

      <label className="block text-[10px] font-semibold uppercase tracking-[.13em] text-[#536174]">
        {en ? "Your message *" : "Votre message *"}
        <textarea
          name="message"
          required
          rows={4}
          minLength={5}
          maxLength={2000}
          className="mt-2 block w-full resize-y rounded-md border border-[#e3dfd5] bg-white p-4 text-sm normal-case tracking-normal leading-6 text-[#18365f] outline-none transition focus:border-[#b5965a] focus:ring-2 focus:ring-[#b5965a]/15"
          placeholder={
            en
              ? "How can we help you?"
              : "Comment pouvons-nous vous aider ?"
          }
          data-testid="textarea-quick-contact-message"
        />
      </label>

      <p className="text-xs leading-5 text-muted-foreground">
        {en
          ? "Your request is stored privately by the practice. Please do not include medical records or other sensitive information."
          : "Votre demande est enregistrée dans l’espace privé du cabinet. N’indiquez pas de dossier médical ni d’information sensible."}
      </p>

      {status === "success" && (
        <div className="space-y-3">
          <p
            role="status"
            className="rounded-md border border-emerald-700/20 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
            data-testid="status-quick-contact-success"
          >
            {en
              ? <>We received your question. Please allow up to 24 hours for a reply. For urgent concerns, call <a className="font-semibold underline underline-offset-2" href={`tel:${phoneLink}`}>{phone}</a>.</>
              : <>Nous avons bien reçu votre question. Merci de patienter jusqu’à 24 h pour une réponse. En cas d’urgence, appelez le <a className="font-semibold underline underline-offset-2" href={`tel:${phoneLink}`}>{phone}</a>.</>}
          </p>
          <ManualContactLinks email={email} phone={phone} />
        </div>
      )}

      {status === "error" && (
        <p
          role="alert"
          className="rounded-md border border-[#e7c8c1] bg-[#f8e9e5] px-4 py-3 text-sm leading-6 text-[#943d35]"
          data-testid="status-quick-contact-error"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#18365f] px-5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#315c9a] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b5965a] disabled:cursor-wait disabled:opacity-70 motion-reduce:transform-none motion-reduce:transition-none"
        data-testid="button-send-quick-contact"
      >
        {status === "sending" ? (
          <>
            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
            {en ? "Sending…" : "Envoi en cours…"}
          </>
        ) : (
          <>
            {en ? "Send my question" : "Envoyer ma question"}
            <ArrowRight
              size={16}
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </>
        )}
      </button>
    </form>
  );
}
