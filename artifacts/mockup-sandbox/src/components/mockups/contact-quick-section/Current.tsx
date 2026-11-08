import "./_group.css";
import { ArrowRight, MessageCircle } from "lucide-react";

export function Current() {
  return (
    <main className="min-h-screen bg-[#f1f3f9] px-6 py-16 text-[#171a35]">
      <section className="mx-auto max-w-[1180px] rounded-2xl border border-[#073e53]/10 bg-[#f8f8f2] p-7 md:flex md:items-center md:justify-between md:gap-10 md:p-10">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#7778bd]">
            Un échange simple
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#073e53]">
            Une question rapide ?
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#626a7a]">
            Écrivez-nous sur WhatsApp pour une question générale sur le cabinet
            ou son fonctionnement.
          </p>
          <p className="mt-3 text-xs leading-5 text-[#8a3440]">
            Ce canal n’est pas destiné aux urgences. N’envoyez pas
            d’informations cliniques ou sensibles par WhatsApp.
          </p>
        </div>
        <div className="mt-7 w-full max-w-sm shrink-0 space-y-3 md:mt-0">
          <label className="block text-xs font-semibold text-[#073e53]">
            Votre question (facultatif)
          </label>
          <textarea
            rows={3}
            readOnly
            value=""
            placeholder="Écrivez une question générale pour le cabinet…"
            className="w-full resize-none rounded-xl border border-[#073e53]/15 bg-white p-3 text-sm leading-6 outline-none"
          />
          <button
            type="button"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#073e53] px-5 text-sm font-semibold text-white"
          >
            <MessageCircle size={18} />
            Continuer dans WhatsApp
            <ArrowRight size={15} />
          </button>
        </div>
      </section>
    </main>
  );
}
