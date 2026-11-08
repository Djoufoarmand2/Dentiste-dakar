import { CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { ManualContactLinks } from "@/components/manual-contact-links";
import { PRACTICE_CONTACT_EMAIL } from "@/lib/contact-info";
import { useSiteLocale } from "@/lib/site-locale";

export function ContactSubmissionReceipt({
  kind,
  phone,
  formboldWarning,
}: {
  kind: "question" | "appointment";
  phone: string;
  formboldWarning: boolean;
}) {
  const en = useSiteLocale() === "en";
  const phoneLink = phone.replace(/[^\d+]/g, "");
  const isAppointment = kind === "appointment";

  return (
    <section
      className="contact-receipt confirmation-in relative isolate overflow-hidden rounded-2xl border border-[#b5965a]/30 bg-[linear-gradient(135deg,#fffdf8_0%,#f8f6ed_55%,#eef6f2_100%)] p-6 shadow-[0_18px_48px_rgba(24,54,95,.11)] md:p-8"
      aria-labelledby={`contact-receipt-title-${kind}`}
      aria-live="polite"
      data-testid={`card-${kind}-success`}
    >
      <span className="contact-receipt-glow pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-[#b5965a]/10 blur-2xl" aria-hidden="true" />
      <div className="relative flex items-start gap-4">
        <span className="contact-receipt-mark grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#e3eee5] text-[#35704b] shadow-[0_8px_24px_rgba(53,112,75,.16)]" aria-hidden="true">
          <CheckCircle2 size={30} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#80652f]">
            {en ? "Message received" : "Message bien reçu"}
          </p>
          <h2 id={`contact-receipt-title-${kind}`} className="mt-1 font-display text-2xl font-semibold leading-tight text-[#18365f] md:text-3xl">
            {isAppointment
              ? en ? "Your request is in good hands." : "Votre demande est entre de bonnes mains."
              : en ? "Thank you for reaching out." : "Merci de nous avoir écrit."}
          </h2>
          <p role="status" className="mt-3 max-w-2xl text-sm leading-7 text-[#46546a]">
            {isAppointment
              ? en
                ? "The practice has received your appointment request. The team will reply within 24 hours to discuss a time. Your request does not reserve an appointment."
                : "Le cabinet a bien reçu votre demande de rendez-vous. L’équipe vous répondra sous 24 h pour convenir d’un créneau. Cette demande ne réserve pas encore de rendez-vous."
              : en
                ? "The practice has received your question. The team will get back to you within 24 hours using your preferred contact method."
                : "Le cabinet a bien reçu votre question. L’équipe vous répondra sous 24 h en utilisant le moyen de contact que vous avez choisi."}
          </p>
        </div>
      </div>

      <div className="relative mt-6 grid gap-4 rounded-xl border border-white/80 bg-white/75 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f4efe1] text-[#80652f]">
            <Clock3 size={17} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#18365f]">
              {en ? "What happens next?" : "Que se passe-t-il ensuite ?"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#536174]">
              {en
                ? "We’ll review your message and contact you. For urgent concerns, call "
                : "Nous allons examiner votre message et vous recontacter. En cas d’urgence, appelez le "}
              <a className="font-semibold text-[#18365f] underline underline-offset-2" href={`tel:${phoneLink}`}>{phone}</a>.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#18365f] px-4 text-xs font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#315c9a] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b5965a] motion-reduce:transform-none motion-reduce:transition-none"
          data-testid={`button-refresh-${kind}-form`}
        >
          <RefreshCw size={15} aria-hidden="true" />
          {en ? "Refresh to send another" : "Actualiser pour envoyer une autre demande"}
        </button>
      </div>

      {formboldWarning && (
        <p
          role="status"
          className="relative mt-4 rounded-lg border border-amber-700/25 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
          data-testid={`status-${kind}-formbold-warning`}
        >
          {en
            ? "Your request is saved, but its FormBold notification could not be confirmed. The practice can still view it in the admin inbox."
            : "Votre demande est bien enregistrée, mais sa notification FormBold n’a pas été confirmée. Le cabinet peut toujours la consulter dans sa boîte admin."}
        </p>
      )}

      <div className="relative mt-5 border-t border-[#18365f]/10 pt-4">
        <p className="mb-3 text-xs font-medium text-[#536174]">
          {en ? `You can also reach us at ${PRACTICE_CONTACT_EMAIL}:` : `Vous pouvez aussi nous joindre à ${PRACTICE_CONTACT_EMAIL} :`}
        </p>
        <ManualContactLinks phone={phone} />
      </div>
      <p className="relative mt-5 text-center text-[11px] leading-5 text-[#687486]">
        {en
          ? "To prevent duplicate requests, this form is now closed. Refresh the page before sending another message."
          : "Pour éviter les demandes en double, ce formulaire est maintenant fermé. Actualisez la page avant d’envoyer un autre message."}
      </p>
    </section>
  );
}
