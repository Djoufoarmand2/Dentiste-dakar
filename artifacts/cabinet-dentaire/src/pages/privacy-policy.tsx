import type { SiteContent } from '@workspace/api-client-react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { SiteShell } from '@/components/public-site';
import { appointmentProviderDisclosure } from '@/lib/appointment-delivery';

export function PrivacyPage({ content }: { content: SiteContent }) {
  return <SiteShell clinic={content.clinic}>
    <main id="contenu-principal">
      <section className="bg-[#070116] text-white">
        <div className="mx-auto max-w-[1240px] px-5 pb-14 pt-16 md:px-8 md:pb-20">
          <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#c9c7ff]">Vos informations</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight md:text-[3.4rem]">Confidentialité</h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/75">Cette page décrit les données demandées par le site, les services utilisés et la suppression manuelle décidée par le cabinet. Les règles propres aux prestataires externes s’appliquent aussi à leurs systèmes.</p>
        </div>
      </section>

      <section className="bg-background py-12 md:py-16">
        <div className="mx-auto max-w-4xl space-y-8 px-5 md:px-8">
          <aside role="note" className="rounded-2xl border border-[#8c6f0b]/25 bg-[#e6e3eb] p-6 md:p-7">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#073e53]"><ShieldCheck size={21} aria-hidden="true" /></span>
              <div>
                <h2 className="font-display text-xl text-[#070116]">Gestion et suppression des données</h2>
                <p className="mt-2 text-sm leading-6 text-foreground/75">Le cabinet décide de la suppression des avis et des demandes qu’il reçoit ; l’application ne leur applique pas de délai automatique. Les règles de conservation propres à FormBold et la procédure de traitement des demandes de droits doivent être vérifiées. Cette page est une information générale et ne constitue pas un avis juridique.</p>
              </div>
            </div>
          </aside>

          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl text-[#073e53]">Responsable du traitement</h2>
            <div className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
              <p>Nom public : <strong className="text-foreground">{content.clinic.name}</strong></p>
              <p>Adresse : <strong className="text-foreground">{content.clinic.address}</strong></p>
              <p>Téléphone : <a className="font-semibold text-foreground underline underline-offset-4" href={`tel:${content.clinic.phone}`}>{content.clinic.phone}</a></p>
              <p>E-mail : <a className="font-semibold text-foreground underline underline-offset-4" href={`mailto:${content.clinic.email}`}>{content.clinic.email}</a></p>
              <p>Responsable légal du traitement : <strong className="text-foreground">Djoufo Armand</strong></p>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl text-[#073e53]">Informations pouvant être saisies</h2>
            <div className="mt-5 space-y-5 text-sm leading-7 text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground">Demande de rendez-vous</h3>
                <p>Le formulaire demande un nom, un numéro de téléphone, une adresse e-mail et un soin souhaité ; la date et le message sont facultatifs. {appointmentProviderDisclosure} Évitez d’indiquer des informations médicales sensibles dans le message. La réception devra être vérifiée sur le site publié avant de collecter des demandes réelles.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Avis public</h3>
                <p>Le formulaire d’avis recueille un nom d’affichage, une note, un commentaire, un soin facultatif et l’autorisation de publication. Après envoi, l’avis est visible publiquement et peut être retiré par le cabinet. Évitez d’y inclure des informations médicales ou personnelles.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Protection contre les envois abusifs</h3>
                <p>Le service d’avis utilise une empreinte dérivée de l’adresse réseau pour limiter les envois répétés. Les empreintes de plus de 10 minutes sont supprimées lors d’une vérification ultérieure.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl text-[#073e53]">Utilisation, destinataires et conservation</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
              <p>Les avis sont enregistrés dans Supabase et restent visibles jusqu’à leur suppression par l’administrateur ; aucun effacement automatique n’est configuré.</p>
              <p>{appointmentProviderDisclosure} Le cabinet détermine la durée de conservation des demandes qu’il reçoit en les supprimant manuellement. FormBold peut appliquer ses propres règles de conservation dans son service ; elles doivent être vérifiées dans les conditions du prestataire.</p>
              <p>Les demandes concernant les données personnelles peuvent être adressées au contact ci-dessous. Le cabinet les traite et supprime manuellement les données concernées selon la demande et ses obligations applicables.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl text-[#073e53]">Questions ou demande de suppression</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Pour contacter le responsable du traitement, demander l’accès ou la suppression de données : <a className="font-semibold text-foreground underline underline-offset-4" href={`mailto:${content.clinic.email}`}>{content.clinic.email}</a> ou <a className="font-semibold text-foreground underline underline-offset-4" href={`tel:${content.clinic.phone}`}>{content.clinic.phone}</a>.</p>
          </section>

          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#073e53] transition-colors hover:text-[#8c6f0b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#073e53]">
            <ArrowRight size={16} aria-hidden="true" /> Retour à l’accueil
          </Link>
        </div>
      </section>
    </main>
  </SiteShell>;
}
