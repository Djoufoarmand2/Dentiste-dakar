import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { submitQuickContactQuestion } from "@/lib/appointment-delivery";
import { useSiteLocale } from "@/lib/site-locale";

export function QuickContactForm({ phone = "+237 677 87 34 42" }: { phone?: string }) {
  const locale = useSiteLocale();
  const en = locale === "en";
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const phoneLink = phone.replace(/[^\d+]/g, "");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const firstName = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    if (!email || !message) return;

    setStatus("sending");
    setErrorMessage("");
    try {
      await submitQuickContactQuestion({ firstName, email, message });
      formRef.current?.reset();
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
        {en ? "Email address *" : "Adresse e-mail *"}
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="mt-2 block h-12 w-full rounded-md border border-[#e3dfd5] bg-white px-4 text-sm normal-case tracking-normal text-[#18365f] outline-none transition focus:border-[#b5965a] focus:ring-2 focus:ring-[#b5965a]/15"
          placeholder={en ? "you@example.com" : "vous@exemple.com"}
          data-testid="input-quick-contact-email"
        />
      </label>

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
          ? "Your details are sent through FormBold so the practice can reply. Please do not include medical records or sensitive information."
          : "Vos coordonnées sont transmises via FormBold afin que le cabinet puisse vous répondre. N’indiquez pas de dossier médical ni d’information sensible."}
      </p>

      {status === "success" && (
        <p
          role="status"
          className="rounded-md border border-emerald-700/20 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
          data-testid="status-quick-contact-success"
        >
          {en
            ? <>We received your question. Please allow up to 24 hours for a reply. For urgent concerns, call <a className="font-semibold underline underline-offset-2" href={`tel:${phoneLink}`}>{phone}</a>.</>
            : <>Nous avons bien reçu votre question. Merci de patienter jusqu’à 24 h pour une réponse. En cas d’urgence, appelez le <a className="font-semibold underline underline-offset-2" href={`tel:${phoneLink}`}>{phone}</a>.</>}
        </p>
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
