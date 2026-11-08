import type { SiteContent } from '@workspace/api-client-react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { SiteShell } from '@/components/public-site';
import { defaultPrivacyPolicyContent } from '@/lib/site-page-defaults';
import { useSiteLocale } from '@/lib/site-locale';

export function PrivacyPage({ content }: { content: SiteContent }) {
  const locale = useSiteLocale();
  const english = locale === 'en';
  const policy = content.privacyPolicy || defaultPrivacyPolicyContent;
  const policySections = policy.sections.some((section) => section.id === 'contact-questions')
    ? policy.sections
    : [...policy.sections, defaultPrivacyPolicyContent.sections.find((section) => section.id === 'contact-questions')!];
  const privacyEmail = content.clinic.email?.trim() || 'bienveillanceclinique4@dentiste-sourireserein.cm';
  const phone = content.clinic.phone?.trim() || '+237 677 873 442';
  const contactHref = `mailto:${privacyEmail}`;
  const localized = (fr: string, en?: string) => english ? en?.trim() || 'English translation not yet available.' : fr;
  const paragraphs = (value: string) => value.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  return <SiteShell clinic={content.clinic} content={content}>
    <main id="contenu-principal">
      <section className="bg-[#070116] text-white">
        <div className="mx-auto max-w-[1240px] px-5 pb-14 pt-16 md:px-8 md:pb-20">
          <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-[#c9c7ff]">{localized(policy.eyebrow, policy.eyebrowEn)}</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight md:text-[3.4rem]">{localized(policy.title, policy.titleEn)}</h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/75">{localized(policy.description, policy.descriptionEn)}</p>
        </div>
      </section>

      <section className="bg-background py-12 md:py-16">
        <div className="mx-auto max-w-4xl space-y-8 px-5 md:px-8">
          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl text-[#073e53]">{english ? 'Data controller' : 'Responsable du traitement'}</h2>
            <div className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
               <p>{english ? 'Public name:' : 'Nom public :'} <strong className="text-foreground">{content.clinic.name}</strong></p>
               <p>{english ? 'Address:' : 'Adresse :'} <strong className="text-foreground">{content.clinic.address}</strong></p>
               <p>{english ? 'Phone:' : 'Téléphone :'} <a className="font-semibold text-foreground underline underline-offset-4" href={`tel:${phone}`}>{phone}</a></p>
               <p>{english ? 'Email:' : 'E-mail :'} <a className="font-semibold text-foreground underline underline-offset-4" href={contactHref}>{privacyEmail}</a></p>
                <p>{english ? 'Data controller:' : 'Responsable légal du traitement :'} <strong className="text-foreground">{policy.controllerName}</strong></p>
            </div>
          </section>

          {policySections.map((section) => <section key={section.id} className="rounded-2xl border border-border bg-card p-6 md:p-8" data-testid={`privacy-section-${section.id}`}>
            <h2 className="font-display text-2xl text-[#073e53]">{localized(section.title, section.titleEn)}</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
              {paragraphs(localized(section.body, section.bodyEn)).map((paragraph, index) => <p key={`${section.id}-${index}`}>{paragraph}</p>)}
            </div>
          </section>)}

          <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 className="font-display text-2xl text-[#073e53]">{localized(policy.contactTitle, policy.contactTitleEn)}</h2>
           <p className="mt-3 text-sm leading-7 text-muted-foreground">{localized(policy.contactIntro, policy.contactIntroEn)} <a className="font-semibold text-foreground underline underline-offset-4" href={contactHref}>{privacyEmail}</a> {english ? 'or' : 'ou'} <a className="font-semibold text-foreground underline underline-offset-4" href={`tel:${phone}`}>{phone}</a>.</p>
          </section>

          <Link href={english ? '/en' : '/'} className="inline-flex items-center gap-2 text-sm font-semibold text-[#073e53] transition-colors hover:text-[#8c6f0b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#073e53]">
            <ArrowRight size={16} aria-hidden="true" /> {english ? 'Back to home' : 'Retour à l’accueil'}
          </Link>
        </div>
      </section>
    </main>
  </SiteShell>;
}
