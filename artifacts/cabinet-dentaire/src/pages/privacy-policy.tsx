import type { SiteContent } from '@workspace/api-client-react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { SiteShell } from '@/components/public-site';
import { appointmentProviderDisclosure } from '@/lib/appointment-delivery';
import { useSiteLocale } from '@/lib/site-locale';

export function PrivacyPage({ content }: { content: SiteContent }) {
  const locale = useSiteLocale();
  const english = locale === 'en';
  const privacyEmail = 'bienveillanceclinique4@gmail.com';
  const phone = '+237 677 873 442';
  const contactHref = `mailto:${privacyEmail}`;
  return <SiteShell clinic={content.clinic} content={content}>
    <main id="contenu-principal">
      <section className="bg-[#070116] text-white">
        <div className="mx-auto max-w-[1240px] px-5 pb-14 pt-16 md:px-8 md:pb-20">
          <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#c9c7ff]">{english ? 'Your information' : 'Vos informations'}</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight md:text-[3.4rem]">{english ? 'Privacy' : 'Confidentialité'}</h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/75">{english ? 'This page explains what information the website asks for, which services are used and how the practice handles deletion requests. External providers may apply their own rules to the data they process.' : 'Cette page décrit les données demandées par le site, les services utilisés et la suppression manuelle décidée par le cabinet. Les règles propres aux prestataires externes s’appliquent aussi à leurs systèmes.'}</p>
        </div>
      </section>

      <section className="bg-background py-12 md:py-16">
        <div className="mx-auto max-w-4xl space-y-8 px-5 md:px-8">
          <aside role="note" className="rounded-2xl border border-[#8c6f0b]/25 bg-[#e6e3eb] p-6 md:p-7">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#073e53]"><ShieldCheck size={21} aria-hidden="true" /></span>
              <div>
                <h2 className="font-display text-xl text-[#070116]">{english ? 'Data handling and deletion' : 'Gestion et suppression des données'}</h2>
                <p className="mt-2 text-sm leading-6 text-foreground/75">{english ? 'The practice decides when to delete reviews and requests it receives; the application does not apply an automatic retention period. FormBold’s retention rules and the process for handling data-rights requests should be checked with the provider. This is general information, not legal advice.' : 'Le cabinet décide de la suppression des avis et des demandes qu’il reçoit ; l’application ne leur applique pas de délai automatique. Les règles de conservation propres à FormBold et la procédure de traitement des demandes de droits doivent être vérifiées. Cette page est une information générale et ne constitue pas un avis juridique.'}</p>
              </div>
            </div>
          </aside>

          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl text-[#073e53]">{english ? 'Data controller' : 'Responsable du traitement'}</h2>
            <div className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
               <p>{english ? 'Public name:' : 'Nom public :'} <strong className="text-foreground">{content.clinic.name}</strong></p>
               <p>{english ? 'Address:' : 'Adresse :'} <strong className="text-foreground">{content.clinic.address}</strong></p>
               <p>{english ? 'Phone:' : 'Téléphone :'} <a className="font-semibold text-foreground underline underline-offset-4" href={`tel:${phone}`}>{phone}</a></p>
               <p>{english ? 'Email:' : 'E-mail :'} <a className="font-semibold text-foreground underline underline-offset-4" href={contactHref}>{privacyEmail}</a></p>
               <p>{english ? 'Data controller:' : 'Responsable légal du traitement :'} <strong className="text-foreground">Djoufo Armand</strong></p>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl text-[#073e53]">{english ? 'Information you may provide' : 'Informations pouvant être saisies'}</h2>
            <div className="mt-5 space-y-5 text-sm leading-7 text-muted-foreground">
              <div>
                 <h3 className="font-semibold text-foreground">{english ? 'Appointment request' : 'Demande de rendez-vous'}</h3>
                 <p>{english ? 'The form asks for your name, phone number, email address and the service you are interested in; the preferred date and message are optional. Appointment requests are sent through the configured form provider. Please avoid including sensitive medical details. The live delivery route should be verified before accepting real requests.' : <>Le formulaire demande un nom, un numéro de téléphone, une adresse e-mail et un soin souhaité ; la date et le message sont facultatifs. {appointmentProviderDisclosure} Évitez d’indiquer des informations médicales sensibles dans le message. La réception devra être vérifiée sur le site publié avant de collecter des demandes réelles.</>}</p>
              </div>
              <div>
                 <h3 className="font-semibold text-foreground">{english ? 'Public review' : 'Avis public'}</h3>
                 <p>{english ? 'The review form collects a display name, rating, comment, optional service and permission to publish. After submission, the review is visible publicly and can be removed by the practice. Do not include medical or other sensitive personal information.' : 'Le formulaire d’avis recueille un nom d’affichage, une note, un commentaire, un soin facultatif et l’autorisation de publication. Après envoi, l’avis est visible publiquement et peut être retiré par le cabinet. Évitez d’y inclure des informations médicales ou personnelles.'}</p>
              </div>
              <div>
                 <h3 className="font-semibold text-foreground">{english ? 'Abuse prevention' : 'Protection contre les envois abusifs'}</h3>
                 <p>{english ? 'The review service uses a fingerprint derived from network information to limit repeated submissions. Fingerprints older than 10 minutes are deleted during a later cleanup.' : 'Le service d’avis utilise une empreinte dérivée de l’adresse réseau pour limiter les envois répétés. Les empreintes de plus de 10 minutes sont supprimées lors d’une vérification ultérieure.'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl text-[#073e53]">{english ? 'Use, recipients and retention' : 'Utilisation, destinataires et conservation'}</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
               <p>{english ? 'Reviews are stored in Supabase and remain visible until an administrator removes them; no automatic deletion period is configured.' : 'Les avis sont enregistrés dans Supabase et restent visibles jusqu’à leur suppression par l’administrateur ; aucun effacement automatique n’est configuré.'}</p>
               <p>{english ? 'The practice decides how long to retain appointment requests and removes them manually. FormBold may apply its own retention rules; check the provider’s terms for details.' : <>{appointmentProviderDisclosure} Le cabinet détermine la durée de conservation des demandes qu’il reçoit en les supprimant manuellement. FormBold peut appliquer ses propres règles de conservation dans son service ; elles doivent être vérifiées dans les conditions du prestataire.</>}</p>
               <p>{english ? 'Requests concerning personal data can be sent to the contact below. The practice handles them and manually removes relevant data in line with the request and applicable obligations.' : 'Les demandes concernant les données personnelles peuvent être adressées au contact ci-dessous. Le cabinet les traite et supprime manuellement les données concernées selon la demande et ses obligations applicables.'}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl text-[#073e53]">{english ? 'Questions or deletion requests' : 'Questions ou demande de suppression'}</h2>
           <p className="mt-3 text-sm leading-7 text-muted-foreground">{english ? 'To contact the data controller or request access to or deletion of data:' : 'Pour contacter le responsable du traitement, demander l’accès ou la suppression de données :'} <a className="font-semibold text-foreground underline underline-offset-4" href={contactHref}>{privacyEmail}</a> {english ? 'or' : 'ou'} <a className="font-semibold text-foreground underline underline-offset-4" href={`tel:${phone}`}>{phone}</a>.</p>
          </section>

          <Link href={english ? '/en' : '/'} className="inline-flex items-center gap-2 text-sm font-semibold text-[#073e53] transition-colors hover:text-[#8c6f0b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#073e53]">
            <ArrowRight size={16} aria-hidden="true" /> {english ? 'Back to home' : 'Retour à l’accueil'}
          </Link>
        </div>
      </section>
    </main>
  </SiteShell>;
}
