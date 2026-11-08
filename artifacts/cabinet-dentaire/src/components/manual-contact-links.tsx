import { Mail, MessageCircle } from "lucide-react";
import { PRACTICE_CONTACT_EMAIL } from "@/lib/contact-info";
import { useSiteLocale } from "@/lib/site-locale";

type ManualContactLinksProps = {
  phone?: string | null;
  tone?: "light" | "dark";
  className?: string;
};

export function ManualContactLinks({
  phone,
  tone = "light",
  className = "",
}: ManualContactLinksProps) {
  const locale = useSiteLocale();
  const address = PRACTICE_CONTACT_EMAIL;
  const phoneDigits = phone?.replace(/\D/g, "") ?? "";
  const whatsappNumber = phoneDigits.length === 9 ? `237${phoneDigits}` : phoneDigits;
  const gmailUrl = address
    ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(address)}&su=${encodeURIComponent("Cabinet Sourire Serein")}`
    : "";
  const whatsappUrl = whatsappNumber.length >= 8
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        locale === "en" ? "Hello, I would like to contact the practice." : "Bonjour, je souhaite contacter le cabinet.",
      )}`
    : "";
  const buttonClass = tone === "dark"
    ? "border-white/25 bg-white/[0.06] text-white hover:border-white/60 hover:bg-white/10"
    : "border-[#18365f]/15 bg-white text-[#18365f] hover:border-[#18365f]/50 hover:bg-[#edf2ff]";

  if (!gmailUrl && !whatsappUrl) return null;

  return (
    <div
      className={`flex flex-wrap gap-2 ${className}`}
      aria-label={locale === "en" ? "Contact the practice directly" : "Contacter directement le cabinet"}
      data-testid="manual-contact-links"
    >
      {gmailUrl && (
        <a
          href={gmailUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b5965a] motion-reduce:transform-none motion-reduce:transition-none ${buttonClass}`}
          data-testid="link-manual-gmail"
        >
          <Mail size={15} aria-hidden="true" />
          Gmail
        </a>
      )}
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25d366] motion-reduce:transform-none motion-reduce:transition-none ${buttonClass}`}
          data-testid="link-manual-whatsapp"
        >
          <MessageCircle size={15} aria-hidden="true" />
          WhatsApp
        </a>
      )}
    </div>
  );
}
