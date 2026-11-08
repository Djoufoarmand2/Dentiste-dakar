import "./_group.css";
import { ArrowRight, Camera, Ghost, Music2 } from "lucide-react";
import { useState } from "react";

const platforms = [
  { name: "Facebook", mark: "f" },
  { name: "Instagram", mark: "◎" },
  { name: "TikTok", mark: "♪" },
  { name: "Snapchat", mark: "" },
];

export function QuickContact() {
  const [sent, setSent] = useState(false);

  return (
    <main className="min-h-screen bg-[#f1f3f9] px-6 py-14 text-[#171a35] md:px-10">
      <section className="mx-auto grid max-w-[1180px] gap-8 md:grid-cols-[1.2fr_.8fr] md:gap-10">
        <div>
          <h1 className="text-3xl font-semibold text-[#20213e]">
            Une question rapide ?
          </h1>
          <p className="mt-2 text-sm text-[#667085]">
            Pas besoin de prendre RDV — écrivez-nous simplement.
          </p>
          <form
            className="relative mt-5 space-y-5 overflow-hidden rounded-lg border border-[#dcd9ce] bg-[#fbfaf7] p-6 pt-8 shadow-[0_10px_35px_rgba(24,54,95,.06)] md:p-8 md:pt-9"
            onSubmit={(event) => {
              event.preventDefault();
              setSent(true);
            }}
          >
            <span className="absolute left-0 top-0 h-[3px] w-12 bg-[#b5965a]" />
            <label className="block text-[10px] font-semibold uppercase tracking-[.13em] text-[#536174]">
              Prénom
              <input
                name="firstName"
                autoComplete="given-name"
                className="mt-2 block h-12 w-full rounded-md border border-[#e3dfd5] bg-white px-4 text-sm outline-none transition focus:border-[#b5965a] focus:ring-2 focus:ring-[#b5965a]/15"
                placeholder="Votre prénom"
              />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-[.13em] text-[#536174]">
              Adresse e-mail *
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-2 block h-12 w-full rounded-md border border-[#e3dfd5] bg-white px-4 text-sm outline-none transition focus:border-[#b5965a] focus:ring-2 focus:ring-[#b5965a]/15"
                placeholder="vous@exemple.com"
              />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-[.13em] text-[#536174]">
              Votre message *
              <textarea
                name="message"
                required
                rows={4}
                maxLength={2000}
                className="mt-2 block w-full resize-y rounded-md border border-[#e3dfd5] bg-white p-4 text-sm leading-6 outline-none transition focus:border-[#b5965a] focus:ring-2 focus:ring-[#b5965a]/15"
                placeholder="Comment pouvons-nous vous aider ?"
              />
            </label>
            <p className="text-xs leading-5 text-[#6b7280]">
              N’indiquez pas de dossier médical ni d’information sensible dans
              ce message.
            </p>
            <button
              type="submit"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#18365f] px-5 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#315c9a] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b5965a]"
            >
              {sent ? "Question prête à être envoyée" : "Envoyer ma question"}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </button>
          </form>
        </div>

        <aside>
          <h2 className="text-3xl font-semibold text-[#20213e]">Suivez-nous</h2>
          <p className="mt-2 text-sm text-[#667085]">
            Découvrez nos derniers cas, conseils et coulisses.
          </p>
          <div className="mt-5 space-y-2">
            {platforms.map((platform, index) => (
              <div
                key={platform.name}
                className="group flex min-h-12 items-center gap-3 rounded-md border border-[#e3dfd5] bg-[#fbfaf7] px-4 text-sm font-medium text-[#18365f] shadow-[0_3px_12px_rgba(24,54,95,.03)] transition duration-200 hover:-translate-y-0.5 hover:border-[#b5965a]/60 hover:bg-white hover:shadow-md"
                style={{ animation: `rise-in 400ms ${index * 70}ms both` }}
              >
                <span className="grid h-7 w-7 place-items-center text-[#8b7141]">
                  {platform.name === "Instagram" ? (
                    <Camera size={18} aria-hidden="true" />
                  ) : platform.name === "TikTok" ? (
                    <Music2 size={18} aria-hidden="true" />
                  ) : platform.name === "Snapchat" ? (
                    <Ghost size={18} aria-hidden="true" />
                  ) : (
                    <span className="text-lg font-bold">{platform.mark}</span>
                  )}
                </span>
                {platform.name}
                <span className="ml-auto text-[10px] font-normal text-[#8b7141] opacity-0 transition-opacity group-hover:opacity-100">
                  Aperçu
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-[#6b7280]">
            Les profils officiels ne s’affichent sur le site qu’après leur
            ajout par l’administrateur.
          </p>
        </aside>
      </section>
      <style>{`@keyframes rise-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } } @media (prefers-reduced-motion: reduce) { .group { animation: none !important; transition: none !important; } }`}</style>
    </main>
  );
}
