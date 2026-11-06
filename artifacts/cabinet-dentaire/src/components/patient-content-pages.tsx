import { ArrowDownRight, ArrowRight, Mail, MapPin, MessageCircle, ShieldCheck, UsersRound } from 'lucide-react';

type Locale = 'fr' | 'en';

export type PatientClinic = {
  name: string;
  city: string;
  phone: string;
  email: string;
};

export type PatientService = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  imageUrl: string;
  purpose?: string;
  purposeEn?: string;
  descriptionEn?: string;
  summaryEn?: string;
  procedureSteps?: string[];
  procedureStepsEn?: string[];
  titleEn?: string;
  imageAlt?: string;
  imageAltEn?: string;
};

type WhyChooseContentProps = {
  clinic: PatientClinic;
  locale: Locale;
};

type ServiceDetailContentProps = {
  clinic: PatientClinic;
  service: PatientService;
  locale: Locale;
};

const copy = {
  fr: {
    whyEyebrow: 'Le cabinet · Douala',
    whyTitle: 'Votre sourire, notre attention à chaque étape.',
    whyIntro: 'Choisir un cabinet, c’est aussi choisir la façon dont on vous accueille. Au Cabinet Sourire Serein, nous voulons que chaque échange soit clair, attentif et respectueux de votre rythme.',
    valuesEyebrow: 'Notre manière de vous accompagner',
    valuesTitle: 'Des repères simples, dès le premier échange.',
    values: [
      {
        number: '01',
        title: 'Être écouté',
        text: 'Vos questions, vos attentes et vos préoccupations ont leur place dans la conversation.',
        Icon: MessageCircle,
      },
      {
        number: '02',
        title: 'Comprendre les soins',
        text: 'Les informations vous sont présentées avec des mots clairs afin que vous puissiez poser vos questions.',
        Icon: ShieldCheck,
      },
      {
        number: '03',
        title: 'Avancer à votre rythme',
        text: 'Vous pouvez échanger avec l’équipe et prendre le temps de comprendre les options proposées.',
        Icon: UsersRound,
      },
    ],
    partnerEyebrow: 'Un environnement de soins',
    partnerTitle: 'Le Cabinet Sourire Serein, en lien avec la Clinique La Bienveillance.',
    partnerBody: 'Le cabinet dentaire vous accueille à Douala dans l’environnement de la Clinique La Bienveillance. Le cabinet et la clinique sont des repères distincts : pour toute question sur votre accueil ou votre venue, contactez-nous directement.',
    contact: 'Nous contacter',
    location: 'À Douala, Cameroun',
    serviceLabel: 'Soin dentaire',
    purpose: 'À quoi sert ce soin ?',
    details: 'À propos de ce soin',
    steps: 'Votre parcours, en quelques mots',
    stepsIntro: 'Les étapes ci-dessous sont les informations communiquées par le cabinet. La prise en charge est expliquée avec vous, selon votre situation.',
    generalFlowTitle: 'Un échange avant toute décision.',
    generalFlow: 'Vous pouvez commencer par nous contacter pour poser vos questions. Lors de votre venue, l’équipe échange avec vous au sujet de votre demande et vous explique les informations utiles. Les prochaines étapes sont discutées avec vous, sans engagement à avancer avant d’avoir compris ce qui est proposé.',
    contactTitle: 'Une question sur ce soin ?',
    contactText: 'Écrivez-nous ou contactez le cabinet pour obtenir des renseignements et échanger sur votre demande.',
    whatsapp: 'Écrire sur WhatsApp',
    email: 'Envoyer un e-mail',
    notSpecified: 'Les informations détaillées sur ce soin sont à confirmer auprès du cabinet.',
  },
  en: {
    whyEyebrow: 'The practice · Douala',
    whyTitle: 'Your smile, our care at every step.',
    whyIntro: 'Choosing a dental practice is also choosing how you will be welcomed. At Cabinet Sourire Serein, we want every conversation to feel clear, attentive and respectful of your pace.',
    valuesEyebrow: 'How we support you',
    valuesTitle: 'A few clear things to expect from the first conversation.',
    values: [
      {
        number: '01',
        title: 'A chance to be heard',
        text: 'Your questions, expectations and concerns all have a place in the conversation.',
        Icon: MessageCircle,
      },
      {
        number: '02',
        title: 'Clear information',
        text: 'Information is shared in plain language so you can ask the questions that matter to you.',
        Icon: ShieldCheck,
      },
      {
        number: '03',
        title: 'At your own pace',
        text: 'You can talk things through with the team and take time to understand the options discussed.',
        Icon: UsersRound,
      },
    ],
    partnerEyebrow: 'A care setting',
    partnerTitle: 'Cabinet Sourire Serein, connected with Clinique La Bienveillance.',
    partnerBody: 'The dental practice welcomes patients in Douala within the setting of Clinique La Bienveillance. The practice and clinic are distinct points of contact; if you have a question about your visit, please contact us directly.',
    contact: 'Contact the practice',
    location: 'Douala, Cameroon',
    serviceLabel: 'Dental care',
    purpose: 'What is this care for?',
    details: 'About this care',
    steps: 'Your visit, in a few steps',
    stepsIntro: 'The steps below are information supplied by the practice. Your care will be discussed with you in light of your situation.',
    generalFlowTitle: 'A conversation comes first.',
    generalFlow: 'You can contact us first to ask questions. When you visit, the team will talk with you about your request and explain the relevant information. Any next steps are discussed together, with time to understand what is being proposed.',
    contactTitle: 'Questions about this service?',
    contactText: 'Write to us or contact the practice to ask for information and talk through your request.',
    whatsapp: 'Message us on WhatsApp',
    email: 'Send an email',
    notSpecified: 'Please contact the practice to confirm further information about this service.',
  },
} as const;

function textParagraphs(value?: string) {
  return value
    ?.trim()
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean) ?? [];
}

function safeImageUrl(value: string) {
  const src = value.trim();
  if (!src) return '';
  if (src.startsWith('/') || src.startsWith('./') || src.startsWith('../')) return src;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' || url.protocol === 'http:' ? src : '';
  } catch {
    return '';
  }
}

function PageKicker({ children, light = false }: { children: string; light?: boolean }) {
  return <p className={`inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.24em] ${light ? 'text-[#d8d9ff]' : 'text-[#555c9c]'}`}>
    <span className={`h-px w-7 ${light ? 'bg-[#c8c7ff]' : 'bg-[#7778bd]'}`} aria-hidden="true" />
    {children}
  </p>;
}

function ContactDetails({ clinic, locale }: { clinic: PatientClinic; locale: Locale }) {
  const isEnglish = locale === 'en';
  const phoneDigits = clinic.phone.replace(/\D/g, '');
  const whatsappHref = `https://wa.me/${phoneDigits}`;

  return <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/15 pt-5 text-sm text-white/75">
    <span className="inline-flex items-center gap-2"><MapPin size={15} aria-hidden="true" />{clinic.city || (isEnglish ? 'Douala' : 'Douala')}</span>
    {clinic.phone && <a href={`tel:${clinic.phone}`} className="transition-colors hover:text-white">{clinic.phone}</a>}
    {clinic.email && <a href={`mailto:${clinic.email}`} className="transition-colors hover:text-white">{clinic.email}</a>}
    <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium text-white underline decoration-white/35 underline-offset-4 transition-colors hover:decoration-white">
      {isEnglish ? 'WhatsApp' : 'WhatsApp'} <ArrowRight size={14} aria-hidden="true" />
    </a>
  </div>;
}

export function WhyChooseContent({ clinic, locale }: WhyChooseContentProps) {
  const t = copy[locale];

  return <main className="overflow-hidden bg-[#f1f3f9] text-[#20213e]" data-testid="page-why-choose">
    <section className="relative isolate overflow-hidden bg-[#18365f] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-[26rem] w-[26rem] rounded-full border border-white/10 md:right-[7%] md:top-[-12rem] md:h-[40rem] md:w-[40rem]" />
      <div aria-hidden="true" className="pointer-events-none absolute right-[9%] top-20 hidden h-[23rem] w-[23rem] rounded-full border border-[#c8c7ff]/20 md:block" />
      <div className="relative mx-auto grid max-w-[1240px] gap-12 px-5 pb-16 pt-16 md:grid-cols-[1.1fr_.9fr] md:items-end md:px-8 md:pb-24 md:pt-24">
        <div className="max-w-3xl">
          <PageKicker light>{t.whyEyebrow}</PageKicker>
          <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.55rem,6vw,5.2rem)] font-medium leading-[1.03] tracking-[-.035em] text-white">
            {t.whyTitle}
          </h1>
          <p className="mt-7 max-w-2xl text-[15px] leading-7 text-white/75 md:text-base md:leading-8">{t.whyIntro}</p>
        </div>
        <div className="relative ml-auto hidden w-full max-w-[340px] md:block" aria-hidden="true">
          <div className="aspect-[4/5] rounded-t-[11rem] border border-white/20 bg-[#24234c]/45 p-3">
            <div className="flex h-full flex-col items-center justify-center rounded-t-[10rem] border border-[#c8c7ff]/30 bg-gradient-to-b from-[#7778bd]/35 to-[#24234c]/45 px-8 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full border border-white/25 text-[#d8d9ff]"><ShieldCheck size={26} strokeWidth={1.25} /></span>
              <span className="mt-7 font-display text-3xl leading-tight text-white">{clinic.name}</span>
              <span className="mt-3 text-[10px] uppercase tracking-[.25em] text-white/60">{clinic.city}</span>
              <span className="mt-9 h-12 w-px bg-gradient-to-b from-[#c8c7ff] to-transparent" />
            </div>
          </div>
          <span className="absolute -bottom-5 -left-8 font-display text-8xl leading-none text-white/10">S</span>
        </div>
      </div>
      <div className="mx-auto max-w-[1240px] px-5 pb-7 md:px-8">
        <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.2em] text-white/50"><ArrowDownRight size={15} />{locale === 'fr' ? 'Une relation de confiance, pas à pas' : 'Trust, built one conversation at a time'}</span>
      </div>
    </section>

    <section className="mx-auto max-w-[1240px] px-5 py-16 md:px-8 md:py-24">
      <div className="grid gap-10 md:grid-cols-[.72fr_1.28fr] md:gap-20">
        <div>
          <PageKicker>{t.valuesEyebrow}</PageKicker>
          <h2 className="mt-5 max-w-md font-display text-3xl font-medium leading-[1.12] tracking-[-.025em] text-[#24234c] md:text-[2.7rem]">{t.valuesTitle}</h2>
          <div className="mt-8 h-px w-16 bg-[#7778bd]" />
        </div>
        <div className="divide-y divide-[#18365f]/12 border-y border-[#18365f]/12">
          {t.values.map(({ number, title, text, Icon }) => <article key={number} className="group grid gap-4 py-6 transition-transform duration-300 hover:translate-x-1 sm:grid-cols-[3.5rem_1fr_auto] sm:items-start sm:gap-6 md:py-8">
            <span className="pt-1 font-display text-sm text-[#7778bd]">{number}</span>
            <div>
              <h3 className="font-display text-[1.45rem] font-medium text-[#24234c]">{title}</h3>
              <p className="mt-2 max-w-xl text-sm leading-7 text-[#4e5573]">{text}</p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-full border border-[#7778bd]/25 text-[#555c9c] transition-colors duration-300 group-hover:bg-[#24234c] group-hover:text-white"><Icon size={18} strokeWidth={1.5} /></span>
          </article>)}
        </div>
      </div>
    </section>

    <section className="relative overflow-hidden bg-[#e5e6f1]">
      <div aria-hidden="true" className="absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full border border-[#7778bd]/15" />
      <div className="relative mx-auto grid max-w-[1240px] gap-8 px-5 py-14 md:grid-cols-[.4fr_1fr] md:items-start md:px-8 md:py-20">
        <div className="flex items-center gap-4 md:flex-col md:items-start">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#24234c] text-[#d8d9ff]"><UsersRound size={22} strokeWidth={1.4} /></span>
          <PageKicker>{t.partnerEyebrow}</PageKicker>
        </div>
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl font-medium leading-tight tracking-[-.025em] text-[#24234c] md:text-[2.8rem]">{t.partnerTitle}</h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#4e5573]">{t.partnerBody}</p>
          <ContactDetails clinic={clinic} locale={locale} />
        </div>
      </div>
    </section>
  </main>;
}

export function ServiceDetailContent({ clinic, service, locale }: ServiceDetailContentProps) {
  const t = copy[locale];
  const isEnglish = locale === 'en';
  const title = (isEnglish ? service.titleEn?.trim() || service.title : service.title).trim();
  const summary = isEnglish ? service.summaryEn?.trim() || service.summary.trim() : service.summary.trim();
  const description = isEnglish ? service.descriptionEn?.trim() || service.description.trim() : service.description.trim();
  const purpose = isEnglish ? service.purposeEn?.trim() : service.purpose?.trim();
  const steps = isEnglish ? service.procedureStepsEn : service.procedureSteps;
  const imageSrc = safeImageUrl(service.imageUrl);
  const descriptionParts = textParagraphs(description);
  const summaryParts = textParagraphs(summary);
  const phoneDigits = clinic.phone.replace(/\D/g, '');
  const whatsappHref = `https://wa.me/${phoneDigits}`;

  return <main className="overflow-hidden bg-[#f1f3f9] text-[#20213e]" data-testid={`page-service-${service.id}`}>
    <section className="relative isolate overflow-hidden bg-[#18365f] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-36 h-[32rem] w-[32rem] rounded-full border border-white/10 md:right-[8%] md:top-[-17rem] md:h-[48rem] md:w-[48rem]" />
      <div className="relative mx-auto grid max-w-[1240px] gap-10 px-5 pb-12 pt-14 md:grid-cols-[1.1fr_.9fr] md:items-center md:px-8 md:pb-16 md:pt-20">
        <div className="max-w-3xl">
          <PageKicker light>{t.serviceLabel}</PageKicker>
          <h1 className="mt-6 font-display text-[clamp(2.7rem,6.5vw,5.3rem)] font-medium leading-[1.02] tracking-[-.035em] text-white">{title}</h1>
          {summaryParts.length > 0 && <div className="mt-6 max-w-2xl space-y-2 text-base leading-7 text-white/75">{summaryParts.map((part, index) => <p key={`${service.id}-summary-${index}`}>{part}</p>)}</div>}
          <div className="mt-8 flex items-center gap-3 text-xs text-white/60"><MapPin size={15} aria-hidden="true" />{clinic.city || 'Douala'}</div>
        </div>
        <figure className="relative mx-auto w-full max-w-[510px]">
          <div className="aspect-[5/3] overflow-hidden rounded-t-[8rem] border border-white/20 bg-[#24234c] p-2 md:aspect-[4/3] md:rounded-t-[12rem]">
            <div className="relative h-full overflow-hidden rounded-t-[7.5rem] bg-[#2a2b58] md:rounded-t-[11.5rem]">
              {imageSrc ? <img src={imageSrc} alt={(isEnglish ? service.imageAltEn?.trim() || service.imageAlt?.trim() : service.imageAlt?.trim()) || title} loading="lazy" decoding="async" className="h-full w-full object-cover opacity-90" /> : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_55%_30%,rgba(119,120,189,.5),transparent_46%),linear-gradient(145deg,#24234c,#18365f)]"><span className="font-display text-8xl text-white/20">{title.slice(0, 1)}</span></div>}
              <div className="absolute inset-0 bg-gradient-to-t from-[#171a35]/45 via-transparent to-transparent" />
            </div>
          </div>
          <figcaption className="mt-3 text-right text-[10px] uppercase tracking-[.18em] text-white/50">{clinic.name} · {clinic.city}</figcaption>
        </figure>
      </div>
    </section>

    <section className="mx-auto max-w-[1240px] px-5 py-14 md:px-8 md:py-20">
      <div className="grid gap-12 md:grid-cols-[.65fr_1.35fr] md:gap-20">
        <div>
          <PageKicker>{t.details}</PageKicker>
          <h2 className="mt-5 font-display text-3xl font-medium leading-tight tracking-[-.025em] text-[#24234c] md:text-[2.5rem]">{title}</h2>
          <span className="mt-6 block h-px w-14 bg-[#7778bd]" />
        </div>
        <div className="max-w-3xl">
          {descriptionParts.length ? <div className="space-y-5 text-[15px] leading-8 text-[#454c6b]">{descriptionParts.map((part, index) => <p key={`${service.id}-description-${index}`}>{part}</p>)}</div> : <p className="text-[15px] leading-8 text-[#454c6b]">{t.notSpecified}</p>}
          {purpose && <aside className="mt-9 border-l-2 border-[#7778bd] bg-[#e7e8f2] px-5 py-5 md:px-7">
            <h3 className="font-display text-xl font-medium text-[#24234c]">{t.purpose}</h3>
            <p className="mt-2 text-sm leading-7 text-[#4e5573]">{purpose}</p>
          </aside>}
        </div>
      </div>
    </section>

    <section className="border-y border-[#18365f]/10 bg-white/55">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 md:grid-cols-[.65fr_1.35fr] md:gap-20 md:px-8 md:py-20">
        <div>
          <PageKicker>{t.steps}</PageKicker>
          <h2 className="mt-5 font-display text-3xl font-medium leading-tight tracking-[-.025em] text-[#24234c] md:text-[2.5rem]">{t.generalFlowTitle}</h2>
          <p className="mt-4 max-w-sm text-sm leading-7 text-[#5a607a]">{t.stepsIntro}</p>
        </div>
        {steps?.length ? <ol className="divide-y divide-[#18365f]/12 border-y border-[#18365f]/12">
          {steps.map((step, index) => <li key={`${service.id}-step-${index}`} className="grid grid-cols-[2.75rem_1fr] gap-4 py-5 md:py-6">
            <span className="font-display text-lg text-[#7778bd]">{String(index + 1).padStart(2, '0')}</span>
            <p className="pt-1 text-sm leading-7 text-[#454c6b]">{step}</p>
          </li>)}
        </ol> : <div className="max-w-3xl border-y border-[#18365f]/12 py-5 text-[15px] leading-8 text-[#454c6b] md:py-6">
          <p>{t.generalFlow}</p>
        </div>}
      </div>
    </section>

    <section className="bg-[#24234c] text-white">
      <div className="mx-auto max-w-[1240px] px-5 py-12 md:px-8 md:py-16">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-2xl">
            <PageKicker light>{clinic.name}</PageKicker>
            <h2 className="mt-5 font-display text-3xl font-medium leading-tight tracking-[-.025em] md:text-[2.75rem]">{t.contactTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-white/70">{t.contactText}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm bg-[#d8d9ff] px-5 text-sm font-semibold text-[#24234c] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#d8d9ff]">
              <MessageCircle size={17} aria-hidden="true" />{t.whatsapp}
            </a>
            <a href={`mailto:${clinic.email}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-white/35 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:border-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#d8d9ff]">
              <Mail size={17} aria-hidden="true" />{t.email}
            </a>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/15 pt-5 text-xs text-white/55">
          {clinic.phone && <a href={`tel:${clinic.phone}`} className="transition-colors hover:text-white">{clinic.phone}</a>}
          {clinic.email && <a href={`mailto:${clinic.email}`} className="transition-colors hover:text-white">{clinic.email}</a>}
          <span>{clinic.city}</span>
        </div>
      </div>
    </section>
  </main>;
}
