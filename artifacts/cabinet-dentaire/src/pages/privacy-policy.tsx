import type { SiteContent } from '@workspace/api-client-react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { SiteShell } from '@/components/public-site';

export function PrivacyPage({ content }: { content: SiteContent }) {
  return <SiteShell clinic={content.clinic}>
    <main id="contenu-principal">
      <section className="bg-[#070116] text-white">
        <div className="mx-auto max-w-[1240px] px-5 pb-14 pt-16 md:px-8 md:pb-20">
          <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#c9c7ff]">Vos informations</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight md:text-[3.4rem]">Confidentialité</h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/75">Les informations sur cette page décrivent le fonctionnement actuel du site. Les éléments manquants doivent être confirmés par le cabinet avant son utilisation avec de vraies données.</p>
        </div>
      </section>

      <section className="bg-background py-12 md:py-16">
        <div className="mx-auto max-w-4xl space-y-8 px-5 md:px-8">
          <aside role="note" className="rounded-2xl border border-[#8c6f0b]/25 bg-[#e6e3eb] p-6 md:p-7">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#073e53]"><ShieldCheck size={21} aria-hidden="true" /></span>
              <div>
                <h2 className="font-display text-xl text-[#070116]">Version provisoire à valider</h2>
                <p className="mt-2 text-sm leading-6 text-foreground/75">Le site et ses coordonnées sont encore des exemples. Le responsable du traitement, ses coordonnées, les durées de conservation et les destinataires du formulaire de rendez-vous doivent être confirmés avant toute publication réelle. Cette page n’est pas un avis juridique.</p>
              </div>
            </div>
          </aside>

          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl text-[#073e53]">Responsable du site</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Nom légal du cabinet, adresse et moyen de contact : <strong className="text-foreground">à compléter et vérifier par le cabinet.</strong></p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl text-[#073e53]">Informations pouvant être saisies</h2>
            <div className="mt-5 space-y-5 text-sm leading-7 text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground">Demande de rendez-vous</h3>
                <p>Le formulaire demande un nom, un numéro de téléphone, une adresse e-mail et un soin souhaité ; la date et le message sont facultatifs. Les demandes sont transmises à Web3Forms pour acheminement au cabinet. L’envoi n’ayant pas encore été validé depuis le navigateur, n’y saisissez pas de données réelles ni de détails médicaux dans l’aperçu.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Avis public</h3>
                <p>Le formulaire d’avis recueille un nom d’affichage, une note, un commentaire, un soin facultatif et l’autorisation de publication. Après envoi, l’avis est visible publiquement et peut être retiré par le cabinet. Évitez d’y inclure des informations médicales ou personnelles.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Protection contre les envois abusifs</h3>
                <p>Le service d’avis utilise une empreinte dérivée de l’adresse réseau pour limiter les envois répétés. La durée de conservation technique et les modalités de traitement doivent être confirmées par le cabinet.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl text-[#073e53]">Utilisation, destinataires et conservation</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
              <p>Les avis envoyés sont enregistrés dans Supabase et publiés sur le site après leur soumission. Ils restent visibles jusqu’à leur suppression par le cabinet ; aucune durée automatique d’effacement n’est définie dans l’application.</p>
              <p>Les demandes de rendez-vous sont transmises à Web3Forms afin que le cabinet puisse y répondre. Les modalités de traitement et la durée de conservation des données par ce prestataire restent à confirmer par le cabinet avant la collecte de demandes réelles.</p>
              <p>La durée de conservation des autres données, les personnes autorisées à y accéder et les modalités d’exercice des demandes liées aux données personnelles : <strong className="text-foreground">à préciser par le responsable du cabinet.</strong></p>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl text-[#073e53]">Questions ou demande de suppression</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">Contact du responsable et procédure de demande : <strong className="text-foreground">à renseigner avec les coordonnées officielles du cabinet.</strong></p>
          </section>

          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#073e53] transition-colors hover:text-[#8c6f0b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#073e53]">
            <ArrowRight size={16} aria-hidden="true" /> Retour à l’accueil
          </Link>
        </div>
      </section>
    </main>
  </SiteShell>;
}
