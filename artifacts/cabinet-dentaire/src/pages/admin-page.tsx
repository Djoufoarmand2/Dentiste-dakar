import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Check, Image as ImageIcon, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { SiteContent } from '@workspace/api-client-react';
import { useCabinetSession } from '@/components/auth-provider';
import { AdminReviewsPanel } from '@/components/admin-reviews-panel';
import { AdminAppointmentsPanel } from '@/components/admin-appointments-panel';
import { AdminMessagingPanel } from '@/components/admin-messaging-panel';
import { MediaField } from '@/components/media-field';
import { LogoWordmark } from '@/components/public-site';
import {
  adminAccessKey,
  adminContentKey,
  collectMediaUrls,
  publicContentKey,
  useAdminAccess,
  useAdminContent,
  usePublishContent,
} from '@/lib/cms';
import { CmsError } from '@/lib/supabase';
import { isValidCampaignPublicationDate } from '@/lib/campaign-dates';
import { fillEnglishFieldsForAdmin, fillEnglishFieldsForBlogAdmin, fillEnglishFieldsForFaqAdmin } from '@/lib/cms-translations';
import { editorialBlogPosts, editorialBlogRelations } from '@/lib/editorial-blog';
import { defaultPrivacyPolicyContent, defaultWhyChooseContent } from '@/lib/site-page-defaults';
import { Link } from 'wouter';

type ArraySection = 'services' | 'team' | 'gallery' | 'testimonials' | 'faqs' | 'blogPosts' | 'campaigns' | 'socialLinks';
type AdminSection = ArraySection | 'clinic' | 'hero' | 'whyChoose' | 'privacyPolicy';

const sections: { key: ArraySection; label: string }[] = [
  { key: 'services', label: 'Soins' },
  { key: 'team', label: 'Équipe' },
  { key: 'gallery', label: 'Galerie' },
  { key: 'testimonials', label: 'Avis' },
  { key: 'faqs', label: 'FAQ' },
  { key: 'blogPosts', label: 'Blog' },
  { key: 'campaigns', label: 'Campagnes' },
  { key: 'socialLinks', label: 'Réseaux sociaux' },
];

const sectionLabels: Record<AdminSection, string> = {
  clinic: 'Cabinet',
  hero: 'Accueil',
  whyChoose: 'Pourquoi nous choisir',
  privacyPolicy: 'Confidentialité',
  services: 'Soins',
  team: 'Équipe',
  gallery: 'Galerie',
  testimonials: 'Avis',
  faqs: 'FAQ',
  blogPosts: 'Blog',
  campaigns: 'Campagnes',
  socialLinks: 'Réseaux sociaux',
};
const adminTabs: { key: AdminSection; label: string }[] = [
  { key: 'clinic', label: sectionLabels.clinic },
  { key: 'hero', label: sectionLabels.hero },
  { key: 'whyChoose', label: sectionLabels.whyChoose },
  { key: 'privacyPolicy', label: sectionLabels.privacyPolicy },
  ...sections,
];

const newItem: Record<ArraySection, Record<string, unknown>> = {
  services: { id: '', title: '', slug: '', summary: '', description: '', imageUrl: '', titleEn: '', slugEn: '', summaryEn: '', descriptionEn: '', purpose: '', purposeEn: '', procedureSteps: '', procedureStepsEn: '', imageAlt: '', imageAltEn: '' },
  team: { id: '', name: '', role: '', biography: '', imageUrl: '', roleEn: '', biographyEn: '' },
  gallery: { id: '', alt: '', imageUrl: '', altEn: '' },
  testimonials: { id: '', name: '', service: '', quote: '', rating: 5, serviceEn: '', quoteEn: '' },
  faqs: { id: '', question: '', answer: '', questionEn: '', answerEn: '' },
  blogPosts: { id: '', title: '', slug: '', excerpt: '', content: '', imageUrl: '', author: '', date: new Date().toISOString().slice(0, 10), published: false, titleEn: '', slugEn: '', excerptEn: '', contentEn: '', authorEn: '', imageAlt: '', imageAltEn: '', relatedServiceSlugs: '', relatedArticleSlugs: '' },
  campaigns: { id: '', title: '', description: '', mediaType: 'image', imageUrl: '', videoUrl: null, active: false, titleEn: '', descriptionEn: '', publishedAt: '', transcript: '', transcriptEn: '' },
  socialLinks: { id: '', platform: 'facebook', label: '', url: '', logoUrl: '', imageAlt: '' },
};

const fieldLabels: Record<string, string> = {
  name: 'Nom', city: 'Ville', address: 'Adresse', phone: 'Téléphone', email: 'Courriel',
  openingHours: 'Horaires', bookingUrl: 'Lien de réservation', mapUrl: 'Lien de carte / intégration',
  logoUrl: 'URL du logo', eyebrow: 'Accroche courte', title: 'Titre', description: 'Description',
  primaryAction: 'Action principale', secondaryAction: 'Action secondaire', imageUrl: 'URL de l’image',
  id: 'Identifiant', slug: 'Adresse courte (slug)', summary: 'Résumé', biography: 'Présentation',
  alt: 'Texte alternatif', service: 'Soin concerné', quote: 'Témoignage', rating: 'Note (1–5)',
  question: 'Question', answer: 'Réponse', excerpt: 'Chapô', content: 'Texte de l’article',
  author: 'Auteur', date: 'Date', published: 'Publié', mediaType: 'Type de média',
  videoUrl: 'Lien de la vidéo', active: 'Campagne active',
  platform: 'Plateforme', label: 'Libellé', url: 'Lien du profil',
  eyebrowEn: 'Accroche · anglais', titleEn: 'Titre · anglais', descriptionEn: 'Description · anglais',
  primaryActionEn: 'Action principale · anglais', secondaryActionEn: 'Action secondaire · anglais',
  slugEn: 'Adresse courte · anglais', summaryEn: 'Résumé · anglais', purpose: 'À quoi sert ce soin ?',
  purposeEn: 'À quoi sert ce soin ? · anglais', procedureSteps: 'Étapes générales du parcours',
  procedureStepsEn: 'Étapes générales du parcours · anglais', imageAlt: 'Texte alternatif de l’image',
  imageAltEn: 'Texte alternatif · anglais', roleEn: 'Rôle · anglais', biographyEn: 'Présentation · anglais',
  altEn: 'Texte alternatif · anglais', serviceEn: 'Soin concerné · anglais', questionEn: 'Question · anglais',
  answerEn: 'Réponse · anglais', excerptEn: 'Chapô · anglais', contentEn: 'Texte de l’article · anglais',
  authorEn: 'Auteur · anglais', openingHoursEn: 'Horaires · anglais', quoteEn: 'Témoignage traduit · anglais',
  relatedServiceSlugs: 'Soins associés (slugs séparés par des virgules)',
  relatedArticleSlugs: 'Articles associés (slugs séparés par des virgules)',
  body: 'Texte', bodyEn: 'Texte · anglais', valuesEyebrow: 'Accroche des valeurs',
  valuesTitle: 'Titre des valeurs', valuesEyebrowEn: 'Accroche des valeurs · anglais',
  valuesTitleEn: 'Titre des valeurs · anglais', partnerEyebrow: 'Accroche partenaire',
  partnerTitle: 'Titre partenaire', partnerBody: 'Présentation du partenaire',
  partnerEyebrowEn: 'Accroche partenaire · anglais', partnerTitleEn: 'Titre partenaire · anglais',
  partnerBodyEn: 'Présentation du partenaire · anglais', controllerName: 'Responsable du traitement',
  contactTitle: 'Titre du contact confidentialité', contactIntro: 'Présentation du contact confidentialité',
  contactTitleEn: 'Titre du contact confidentialité · anglais', contactIntroEn: 'Présentation du contact confidentialité · anglais',
  publishedAt: 'Date originale de mise en ligne YouTube', transcript: 'Transcription vidéo', transcriptEn: 'Transcription vidéo · anglais',
};

function ensureTranslationFields(content: SiteContent): SiteContent {
  const whyChoose = { ...defaultWhyChooseContent, ...content.whyChoose, values: content.whyChoose?.values ?? defaultWhyChooseContent.values };
  const privacySections = content.privacyPolicy?.sections ?? defaultPrivacyPolicyContent.sections;
  const privacyPolicy = {
    ...defaultPrivacyPolicyContent,
    ...content.privacyPolicy,
    sections: privacySections.some((section) => section.id === 'contact-questions')
      ? privacySections
      : [...privacySections, defaultPrivacyPolicyContent.sections.find((section) => section.id === 'contact-questions')!],
  };
  const existingBlogSlugs = new Set(content.blogPosts.map((post) => post.slug));
  const editorialSeedsBySlug = editorialBlogRelations;
  const blogPosts = [
    ...content.blogPosts.map((post) => {
      const seed = editorialSeedsBySlug[post.slug];
      return {
        ...post,
        relatedServiceSlugs: post.relatedServiceSlugs ?? seed?.relatedServiceSlugs ?? '',
        relatedArticleSlugs: post.relatedArticleSlugs ?? seed?.relatedArticleSlugs ?? '',
      };
    }),
    ...(content.editorialBlogLibraryManaged
      ? []
      : editorialBlogPosts.filter((post) => !existingBlogSlugs.has(post.slug))),
  ];
  return {
    ...content,
    socialLinks: content.socialLinks ?? [],
    editorialBlogLibraryManaged: true,
    clinic: { ...content.clinic, openingHoursEn: content.clinic.openingHoursEn ?? '' },
    hero: {
      ...content.hero,
      eyebrowEn: content.hero.eyebrowEn?.trim() || `Dental practice in ${content.clinic.city || 'Douala'}`,
      titleEn: content.hero.titleEn?.trim() || `Attentive dental care in ${content.clinic.city || 'Douala'}.`,
      descriptionEn: content.hero.descriptionEn?.trim() || `Cabinet Sourire Serein welcomes patients at Clinique La Bienveillance in ${content.clinic.city || 'Douala'} for dental consultations and care.`,
      primaryActionEn: content.hero.primaryActionEn?.trim() || 'Request an appointment',
      secondaryActionEn: content.hero.secondaryActionEn?.trim() || 'Explore our services',
    },
    whyChoose,
    privacyPolicy,
    services: content.services.map((source) => {
      const item = fillEnglishFieldsForAdmin(source);
      return {
      ...item,
      titleEn: item.titleEn ?? '',
      slugEn: item.slugEn ?? '',
      summaryEn: item.summaryEn ?? '',
      descriptionEn: item.descriptionEn ?? '',
      purpose: item.purpose ?? '',
      purposeEn: item.purposeEn ?? '',
      procedureSteps: item.procedureSteps ?? '',
      procedureStepsEn: item.procedureStepsEn ?? '',
      imageAlt: item.imageAlt ?? '',
      imageAltEn: item.imageAltEn ?? '',
    };
    }),
    team: content.team.map((item) => ({ ...item, roleEn: item.roleEn ?? '', biographyEn: item.biographyEn ?? '' })),
    gallery: content.gallery.map((item) => ({ ...item, altEn: item.altEn ?? '' })),
    testimonials: content.testimonials.map((item) => ({ ...item, serviceEn: item.serviceEn ?? '', quoteEn: item.quoteEn ?? '' })),
    faqs: content.faqs.map((item) => fillEnglishFieldsForFaqAdmin(item)),
    blogPosts: blogPosts.map((source) => {
      const item = fillEnglishFieldsForBlogAdmin(source);
      return {
      ...item,
      titleEn: item.titleEn ?? '',
      slugEn: item.slugEn ?? '',
      excerptEn: item.excerptEn ?? '',
      contentEn: item.contentEn ?? '',
      authorEn: item.authorEn ?? '',
      imageAlt: item.imageAlt ?? '',
      imageAltEn: item.imageAltEn ?? '',
      relatedServiceSlugs: item.relatedServiceSlugs ?? editorialBlogRelations[source.slug]?.relatedServiceSlugs ?? '',
      relatedArticleSlugs: item.relatedArticleSlugs ?? editorialBlogRelations[source.slug]?.relatedArticleSlugs ?? '',
    };
    }),
    campaigns: content.campaigns.map((item) => ({ ...item, titleEn: item.titleEn ?? '', descriptionEn: item.descriptionEn ?? '', publishedAt: item.publishedAt ?? '', transcript: item.transcript ?? '', transcriptEn: item.transcriptEn ?? '' })),
  };
}

type TranslationGap = { section: AdminSection; id?: string; label: string; missing: string[] };

function missingEnglishContent(content: SiteContent): TranslationGap[] {
  const gaps: TranslationGap[] = [];
  const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
  const addGap = (
    section: AdminSection,
    values: Record<string, unknown>,
    pairs: [string, string][],
    label: string,
    id?: string,
  ) => {
    const missing = pairs
      .filter(([source, translation]) => hasText(values[source]) && !hasText(values[translation]))
      .map(([, translation]) => fieldLabels[translation] || translation);
    if (missing.length) gaps.push({ section, id, label, missing });
  };
  const allPairs: Record<AdminSection, [string, string][]> = {
    clinic: [['openingHours', 'openingHoursEn']],
    hero: [['eyebrow', 'eyebrowEn'], ['title', 'titleEn'], ['description', 'descriptionEn'], ['primaryAction', 'primaryActionEn'], ['secondaryAction', 'secondaryActionEn']],
    whyChoose: [['eyebrow', 'eyebrowEn'], ['title', 'titleEn'], ['intro', 'introEn'], ['valuesEyebrow', 'valuesEyebrowEn'], ['valuesTitle', 'valuesTitleEn'], ['partnerEyebrow', 'partnerEyebrowEn'], ['partnerTitle', 'partnerTitleEn'], ['partnerBody', 'partnerBodyEn']],
    privacyPolicy: [['eyebrow', 'eyebrowEn'], ['title', 'titleEn'], ['description', 'descriptionEn'], ['contactTitle', 'contactTitleEn'], ['contactIntro', 'contactIntroEn']],
    services: [['title', 'titleEn'], ['slug', 'slugEn'], ['summary', 'summaryEn'], ['description', 'descriptionEn'], ['purpose', 'purposeEn'], ['procedureSteps', 'procedureStepsEn'], ['imageAlt', 'imageAltEn']],
    team: [['role', 'roleEn'], ['biography', 'biographyEn']],
    gallery: [['alt', 'altEn']],
    testimonials: [['service', 'serviceEn'], ['quote', 'quoteEn']],
    faqs: [['question', 'questionEn'], ['answer', 'answerEn']],
    blogPosts: [['title', 'titleEn'], ['slug', 'slugEn'], ['excerpt', 'excerptEn'], ['content', 'contentEn'], ['author', 'authorEn'], ['imageAlt', 'imageAltEn']],
    campaigns: [['title', 'titleEn'], ['description', 'descriptionEn'], ['transcript', 'transcriptEn']],
    socialLinks: [],
  };

  for (const section of ['clinic', 'hero', 'whyChoose', 'privacyPolicy'] as const) {
    const source = content[section];
    if (!source) continue;
    const values = source as unknown as Record<string, unknown>;
    addGap(section, values, allPairs[section], sectionLabels[section]);
  }
  content.whyChoose?.values.forEach((item) => addGap('whyChoose', item as unknown as Record<string, unknown>, [['title', 'titleEn'], ['body', 'bodyEn']], item.title || 'Valeur', item.id));
  content.privacyPolicy?.sections.forEach((item) => addGap('privacyPolicy', item as unknown as Record<string, unknown>, [['title', 'titleEn'], ['body', 'bodyEn']], item.title || 'Rubrique', item.id));
  for (const section of sections.map((entry) => entry.key)) {
    const items = content[section] as unknown as Record<string, unknown>[];
    items.forEach((item, index) => addGap(section, item, allPairs[section], String(item.title || item.name || item.question || item.alt || sectionLabels[section]), String(item.id || index)));
  }
  return gaps;
}

export default function AdminPage() {
  const { session } = useCabinetSession();
  const access = useAdminAccess();
  const contentQuery = useAdminContent(!!access.data?.isAdmin);
  const update = usePublishContent();
  const client = useQueryClient();
  const [draft, setDraft] = useState<SiteContent | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [section, setSection] = useState<AdminSection>('clinic');
  const [saved, setSaved] = useState(false);
  const [publicationValidationError, setPublicationValidationError] = useState<string | null>(null);
  const [seoRefreshStatus, setSeoRefreshStatus] = useState<'idle' | 'preview' | 'triggering' | 'started' | 'failed'>('idle');
  const [focusTarget, setFocusTarget] = useState<string | null>(null);

  useEffect(() => {
    if (contentQuery.data && draft === null) {
      setDraft(ensureTranslationFields(JSON.parse(JSON.stringify(contentQuery.data.content)) as SiteContent));
      setVersion(contentQuery.data.version);
    }
  }, [contentQuery.data, draft]);

  const currentFields = section === 'clinic'
    ? draft?.clinic
    : section === 'hero'
      ? draft?.hero
      : section === 'whyChoose'
        ? draft?.whyChoose
        : section === 'privacyPolicy'
          ? draft?.privacyPolicy
          : null;
  const entries = !draft
    ? []
    : section === 'whyChoose'
      ? draft.whyChoose?.values as unknown as Record<string, unknown>[] || []
      : section === 'privacyPolicy'
        ? draft.privacyPolicy?.sections as unknown as Record<string, unknown>[] || []
        : section === 'clinic' || section === 'hero'
          ? []
          : draft[section] as unknown as Record<string, unknown>[];
  const translationGaps = draft ? missingEnglishContent(draft) : [];
  const busy = update.isPending;
  const protectedUrls = collectMediaUrls(draft);
  const seoRefreshMessage = seoRefreshStatus === 'preview'
    ? 'Contenu publié. Le sitemap sera régénéré au prochain build.'
    : seoRefreshStatus === 'triggering'
      ? 'Contenu publié. Demande de régénération Cloudflare en cours…'
      : seoRefreshStatus === 'started'
        ? 'Régénération Cloudflare lancée. Google explorera les nouvelles pages lors de son prochain passage.'
        : seoRefreshStatus === 'failed'
          ? 'Contenu publié et visible, mais la régénération SEO n’a pas démarré. Vérifiez la configuration du hook Cloudflare.'
          : null;

  function markDraftChanged() {
    setSaved(false);
    setPublicationValidationError(null);
    setSeoRefreshStatus('idle');
  }

  useEffect(() => {
    if (!focusTarget) return;
    const timeout = window.setTimeout(() => {
      const target = document.getElementById(focusTarget);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')?.focus();
      setFocusTarget(null);
    }, 80);
    return () => window.clearTimeout(timeout);
  }, [focusTarget, section]);

  function setObjectField(key: string, raw: string) {
    if (busy || !draft || !currentFields) return;
    const value = (currentFields as unknown as Record<string, unknown>)[key];
    const nextValue = typeof value === 'number' ? Number(raw) : raw;
    setDraft({ ...draft, [section]: { ...currentFields, [key]: nextValue } } as SiteContent);
    markDraftChanged();
  }

  function setArrayField(index: number, key: string, raw: string) {
    if (busy || !draft || section === 'clinic' || section === 'hero') return;
    const source = section === 'whyChoose'
      ? draft.whyChoose?.values ?? []
      : section === 'privacyPolicy'
        ? draft.privacyPolicy?.sections ?? []
        : draft[section];
    const current = [...(source as unknown as Record<string, unknown>[])];
    const value = current[index][key];
    let nextValue: unknown = raw;
    if (typeof value === 'number') nextValue = Number(raw);
    if (typeof value === 'boolean') nextValue = raw === 'true';
    if (key === 'videoUrl' && raw.trim() === '') nextValue = null;
    current[index] = { ...current[index], [key]: nextValue };
    if (section === 'whyChoose') {
      setDraft({ ...draft, whyChoose: { ...draft.whyChoose!, values: current as unknown as NonNullable<SiteContent['whyChoose']>['values'] } });
    } else if (section === 'privacyPolicy') {
      setDraft({ ...draft, privacyPolicy: { ...draft.privacyPolicy!, sections: current as unknown as NonNullable<SiteContent['privacyPolicy']>['sections'] } });
    } else {
      setDraft({ ...draft, [section]: current } as SiteContent);
    }
    markDraftChanged();
  }

  function addItem() {
    if (busy || !draft || section === 'clinic' || section === 'hero') return;
    const id = `${section}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    if (section === 'whyChoose') {
      const values = [...(draft.whyChoose?.values ?? []), { id, title: '', body: '', titleEn: '', bodyEn: '' }];
      setDraft({ ...draft, whyChoose: { ...draft.whyChoose!, values } });
    } else if (section === 'privacyPolicy') {
      const sections = [...(draft.privacyPolicy?.sections ?? []), { id, title: '', body: '', titleEn: '', bodyEn: '', required: false }];
      setDraft({ ...draft, privacyPolicy: { ...draft.privacyPolicy!, sections } });
    } else {
      const item = { ...newItem[section], id };
      setDraft({ ...draft, [section]: [...(draft[section] as unknown as Record<string, unknown>[]), item] } as SiteContent);
    }
    markDraftChanged();
  }

  function removeItem(index: number) {
    if (busy || !draft || section === 'clinic' || section === 'hero') return;
    const source = section === 'whyChoose'
      ? draft.whyChoose?.values ?? []
      : section === 'privacyPolicy'
        ? draft.privacyPolicy?.sections ?? []
        : draft[section];
    const current = source as unknown as Record<string, unknown>[];
    if (section === 'privacyPolicy' && current[index]?.required === true) {
      window.alert('Cette rubrique de confidentialité est requise et ne peut pas être supprimée.');
      return;
    }
    if (!window.confirm('Supprimer cet élément ? Cette action sera appliquée après publication.')) return;
    const next = current.filter((_, i) => i !== index);
    if (section === 'whyChoose') {
      setDraft({ ...draft, whyChoose: { ...draft.whyChoose!, values: next as unknown as NonNullable<SiteContent['whyChoose']>['values'] } });
    } else if (section === 'privacyPolicy') {
      setDraft({ ...draft, privacyPolicy: { ...draft.privacyPolicy!, sections: next as unknown as NonNullable<SiteContent['privacyPolicy']>['sections'] } });
    } else {
      setDraft({ ...draft, [section]: next } as SiteContent);
    }
    markDraftChanged();
  }

  function publish() {
    if (!draft || version === null) return;
    const videoMissingDate = draft.campaigns.find(
      (campaign) => campaign.mediaType === 'video' && campaign.active && !isValidCampaignPublicationDate(campaign.publishedAt),
    );
    if (videoMissingDate) {
      setSection('campaigns');
      setFocusTarget(`admin-entry-campaigns-${videoMissingDate.id}`);
      setPublicationValidationError(
        `Ajoutez la date originale de mise en ligne YouTube pour « ${videoMissingDate.title || 'cette vidéo'} » avant de publier.`,
      );
      return;
    }
    setPublicationValidationError(null);
    update.mutate({ content: draft, expectedVersion: version }, {
      onSuccess: async (document) => {
        client.setQueryData([...adminContentKey, session?.user.id], document);
        void client.invalidateQueries({ queryKey: publicContentKey });
        void client.invalidateQueries({ queryKey: adminAccessKey });
        setDraft(ensureTranslationFields(JSON.parse(JSON.stringify(document.content)) as SiteContent));
        setVersion(document.version);
        setSaved(true);
        if (!import.meta.env.PROD) {
          setSeoRefreshStatus('preview');
          return;
        }
        if (!session?.access_token) {
          setSeoRefreshStatus('failed');
          return;
        }
        setSeoRefreshStatus('triggering');
        try {
          const response = await fetch('/api/seo-rebuild', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const result = await response.json().catch(() => null) as { ok?: boolean } | null;
          if (!response.ok || result?.ok !== true) throw new Error('Cloudflare rebuild was not confirmed.');
          setSeoRefreshStatus('started');
        } catch {
          setSeoRefreshStatus('failed');
        }
      },
    });
  }

  async function reloadDraft() {
    if (!window.confirm('Recharger la dernière publication ? Les modifications non publiées affichées ici seront abandonnées.')) return;
    const result = await contentQuery.refetch();
    if (result.data) {
      setDraft(ensureTranslationFields(structuredClone(result.data.content)));
      setVersion(result.data.version);
      markDraftChanged();
      update.reset();
    }
  }

  if (access.isLoading) return <div className="min-h-[100dvh] bg-[#e6e3eb] p-6"><div className="mx-auto max-w-6xl"><div className="h-12 w-48 animate-pulse rounded bg-secondary" /><div className="mt-8 h-[420px] animate-pulse rounded-3xl bg-secondary/60" /></div></div>;
  if (access.isError || !access.data?.isAdmin) return <div className="flex min-h-[100dvh] items-center justify-center bg-[#e6e3eb] px-5"><div className="max-w-md rounded-[30px] border border-border bg-card p-9 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary"><ShieldCheck size={24} /></span><h1 className="mt-5 font-display text-3xl">Espace réservé</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Connectez-vous avec un compte administrateur autorisé pour modifier le site.</p><Link href="/sign-in" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-wide text-primary-foreground" data-testid="link-admin-signin">Accéder à la connexion</Link><Link href="/" className="mt-4 block text-xs text-primary" data-testid="link-admin-home">Retour au site</Link></div></div>;
  if (contentQuery.isError) return <div className="mx-auto max-w-3xl px-5 py-20"><section className="rounded-2xl border border-border bg-card p-8 text-center" role="alert"><h1 className="font-display text-2xl text-[#073e53]">Impossible de charger le contenu</h1><p className="mt-3 text-sm text-muted-foreground">{contentQuery.error.message}</p><button onClick={() => void contentQuery.refetch()} className="btn-gold mt-6">Réessayer</button></section></div>;
  if (contentQuery.isLoading || !draft) return <div className="min-h-[100dvh] bg-[#e6e3eb] p-6"><div className="mx-auto max-w-6xl"><div className="h-12 w-56 animate-pulse rounded bg-secondary" /><div className="mt-8 h-96 rounded-3xl bg-secondary/60" /></div></div>;

  return <div className="min-h-[100dvh] bg-[#e6e3eb] text-foreground">
    <header className="sticky top-0 z-20 border-b border-border bg-[#e6e3eb]/95 backdrop-blur"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8"><div className="flex items-center gap-3"><LogoWordmark clinic={draft.clinic} /><div className="border-l border-border pl-3"><p className="text-[9px] font-bold uppercase tracking-[.2em] text-primary">Administration</p><h1 className="mt-1 font-display text-xl md:text-2xl">Espace de publication</h1></div></div><div className="flex flex-wrap items-center gap-3"><Link href="/" className="hidden text-xs text-muted-foreground hover:text-primary sm:block" data-testid="link-admin-preview">Voir le site <ArrowUpRight className="ml-1 inline" size={13} /></Link><Link href="/sign-in" className="text-xs text-primary" data-testid="link-admin-account">Mon compte / déconnexion</Link><button onClick={publish} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-primary-foreground disabled:opacity-60" data-testid="button-publish-site">{busy ? 'Publication…' : saved ? <><Check size={14} /> Publié</> : 'Publier les changements'} <ArrowUpRight size={14} /></button></div></div></header>
    <div className="mx-auto grid max-w-[1500px] gap-7 px-4 py-6 md:grid-cols-[220px_1fr] md:px-8 md:py-9">
      <aside className="md:sticky md:top-[90px] md:h-fit"><div className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible">
        {adminTabs.map(({ key, label }) => {
          const missingCount = translationGaps.filter((gap) => gap.section === key).length;
          return <button key={key} onClick={() => setSection(key)} className={`shrink-0 rounded-full px-4 py-3 text-left text-xs font-medium transition-colors md:w-full md:rounded-xl ${section === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`} data-testid={`button-admin-tab-${key}`}>{label}{missingCount > 0 && <span className="ml-2 rounded-full bg-[#b94f5b]/15 px-2 py-0.5 text-[10px] font-bold text-[#8a3440]" aria-label={`${missingCount} contenus à traduire`}>{missingCount}</span>}</button>;
        })}
      </div><p className="mt-6 hidden rounded-2xl border border-border bg-card p-4 text-[11px] leading-5 text-muted-foreground md:block">Les changements sont enregistrés ensemble et deviennent visibles dès leur publication.</p></aside>
      <main className="min-w-0">
        <div className="mb-6 flex flex-col justify-between gap-2 md:flex-row md:items-end"><div><p className="text-[10px] uppercase tracking-[.2em] text-primary">{section === 'clinic' ? 'Coordonnées & identité' : section === 'hero' ? 'Première impression' : sectionLabels[section]}</p><h2 className="mt-2 font-display text-3xl md:text-4xl">{section === 'clinic' ? 'Informations du cabinet' : section === 'hero' ? 'Contenu de l’accueil' : sectionLabels[section]}</h2></div><p className="text-xs text-muted-foreground">Modifications non publiées : enregistrées dans cette session</p></div>
        {section === 'blogPosts' && !contentQuery.data?.content.editorialBlogLibraryManaged && <div className="mb-6 rounded-2xl border border-[#8c6f0b]/25 bg-[#fff9e8] p-5 text-sm leading-6 text-[#4d432a]" role="status" data-testid="notice-editorial-blog-import">Les {editorialBlogPosts.length} nouveaux articles et leurs liens vers les soins sont préchargés dans ce brouillon. Publiez une première fois pour les enregistrer dans le CMS ; vous pourrez ensuite les modifier, les dépublier ou les supprimer ici sans qu’ils réapparaissent depuis les fichiers du site.</div>}
        {translationGaps.length > 0 && <section className="mb-7 rounded-2xl border border-[#8c6f0b]/25 bg-[#fff9e8] p-5 md:p-6" aria-labelledby="translation-gaps-title" data-testid="translation-gaps">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="translation-gaps-title" className="font-display text-xl text-[#073e53]">Traductions anglaises à compléter</h3><p className="mt-1 text-sm text-muted-foreground">{translationGaps.length} contenu(s) ont des champs anglais vides. Ouvrez un élément pour les compléter, puis publiez les changements.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#8c6f0b]">{translationGaps.length} à vérifier</span></div>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">{translationGaps.slice(0, 16).map((gap) => {
            const targetId = gap.id
              ? `admin-entry-${gap.section}-${gap.id}`
              : `admin-singleton-${gap.section}`;
            return <li key={`${gap.section}-${gap.id || gap.label}`}><button type="button" onClick={() => { setSection(gap.section); setFocusTarget(targetId); }} className="w-full rounded-xl border border-[#8c6f0b]/15 bg-white px-4 py-3 text-left transition-colors hover:border-[#8c6f0b]/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8c6f0b]" data-testid="button-open-translation-gap"><span className="block text-xs font-semibold text-[#073e53]">{gap.label} · {sectionLabels[gap.section]}</span><span className="mt-1 block text-[11px] leading-5 text-muted-foreground">{gap.missing.join(' · ')}</span></button></li>;
          })}</ul>
          {translationGaps.length > 16 && <p className="mt-3 text-xs text-muted-foreground">Les autres éléments sont signalés dans leurs onglets respectifs.</p>}
        </section>}
        {section === 'testimonials' && <div className="mb-5 rounded-2xl border border-[#b94f5b]/40 bg-[#f7e9ec] p-4 text-xs leading-5 text-[#070116]" data-testid="notice-admin-sample-content"><b>Consentement :</b> les témoignages historiques du CMS ne comportent pas de preuve de consentement enregistrée. Faites confirmer l’autorisation par le cabinet avant tout transfert ou nouvelle publication. Les exemples fictifs identifiés sont masqués du site public.</div>}
         {section === 'socialLinks' && <p className="mb-5 rounded-2xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground" data-testid="notice-social-links-help">Ajoutez les profils officiels du cabinet. Si le champ logo est vide, le site affiche l’icône intégrée correspondant à la plateforme. Les changements deviennent visibles après publication.</p>}
        <AdminAppointmentsPanel />
         <AdminMessagingPanel />
        {section === 'testimonials' && <div className="mb-8"><AdminReviewsPanel /></div>}
        {(section === 'clinic' || section === 'hero' || section === 'whyChoose' || section === 'privacyPolicy') && <div id={`admin-singleton-${section}`} className="grid gap-4 md:grid-cols-2" data-testid={`admin-singleton-${section}`}>
          {Object.entries(currentFields || {}).filter(([key]) => key !== 'values' && key !== 'sections').map(([key, value]) => <AdminField key={`${section}-${key}`} name={key} value={value} onChange={(raw) => setObjectField(key, raw)} wide={['description', 'openingHours', 'intro', 'partnerBody', 'contactIntro'].includes(key)} protectedUrls={protectedUrls} disabled={busy} />)}
        </div>}
        {section !== 'clinic' && section !== 'hero' && <div className="space-y-5">
          {section === 'testimonials' && <section className="rounded-2xl border border-border bg-card p-5 md:p-7" data-testid="cms-testimonials-section">
            <p className="eyebrow">Document CMS du site</p>
            <h3 className="mt-2 font-display text-2xl text-[#073e53]">Témoignages historiques</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Gérez ici les témoignages déjà présents dans le contenu du site. Les avis du formulaire et ceux publiés par le cabinet se gèrent dans la liste ci-dessus. Après confirmation du consentement, ajoutez l’ancien témoignage dans la liste d’avis gérés ci-dessus, puis retirez son entrée CMS. Les doublons temporaires sont masqués sur le site public.</p>
          </section>}
          {entries.map((item, index) => <section key={String(item.id ?? index)} id={`admin-entry-${section}-${String(item.id ?? index)}`} className="rounded-[22px] border border-border bg-card p-5 md:p-6" data-testid={`admin-entry-${section}-${String(item.id ?? index)}`}>
             <div className="mb-5 flex items-center justify-between border-b border-border pb-4"><div><p className="text-[9px] uppercase tracking-[.18em] text-muted-foreground">{sectionLabels[section]} · {String(item.id || `Élément ${index + 1}`)}</p><h3 className="mt-1 font-display text-xl">{String(item.title || item.name || item.label || item.question || item.alt || `Élément ${index + 1}`)}</h3></div><button type="button" onClick={() => removeItem(index)} disabled={busy || (section === 'privacyPolicy' && item.required === true)} title={section === 'privacyPolicy' && item.required === true ? 'Cette rubrique est nécessaire à la page de confidentialité.' : 'Supprimer cet élément'} aria-label="Supprimer cet élément" className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30" data-testid={`button-remove-${section}-${index}`}><Trash2 size={16} /></button></div>
             <div className="grid gap-4 md:grid-cols-2">{Object.entries(item).filter(([key]) => !(section === 'privacyPolicy' && key === 'required')).map(([key, value]) => {
               const videoDateField = section === 'campaigns' && key === 'publishedAt' && item.mediaType === 'video';
               return <AdminField
                 key={`${String(item.id)}-${key}`}
                 name={key}
                 value={value}
                 onChange={(raw) => setArrayField(index, key, raw)}
                 wide={['description', 'biography', 'quote', 'answer', 'content', 'excerpt', 'body', 'transcript', 'transcriptEn', 'relatedServiceSlugs', 'relatedArticleSlugs'].includes(key)}
                 protectedUrls={protectedUrls}
                 disabled={busy}
                  required={videoDateField && item.active === true || section === 'socialLinks' && ['id', 'label', 'url'].includes(key)}
                 helperText={videoDateField
                   ? 'Utilisez la date réelle de publication de la vidéo sur YouTube. Obligatoire avant publication si la vidéo est active.'
                    : section === 'socialLinks' && key === 'logoUrl'
                      ? 'Facultatif : si le logo est vide, le site affiche automatiquement l’icône intégrée de la plateforme.'
                   : key === 'relatedServiceSlugs'
                     ? 'Saisissez les slugs de soins séparés par des virgules ; seuls les soins existants seront affichés.'
                     : key === 'relatedArticleSlugs'
                       ? 'Saisissez les slugs d’articles séparés par des virgules ; seuls les articles publiés seront affichés.'
                       : undefined}
               />;
             })}</div>
            {typeof item.imageUrl === 'string' && item.imageUrl && <div className="mt-4"><p className="mb-2 text-[10px] uppercase tracking-[.16em] text-muted-foreground">Aperçu</p><div className="h-48 overflow-hidden rounded-xl bg-secondary"><img src={item.imageUrl} alt="Aperçu du visuel" loading="lazy" className="h-full w-full object-cover" /></div></div>}
          </section>)}
          {!entries.length && <div className="rounded-[22px] border border-dashed border-border bg-card/60 p-10 text-center" data-testid={`empty-admin-${section}`}><ImageIcon className="mx-auto text-primary/70" size={24} /><h3 className="mt-4 font-display text-xl">Aucun élément pour le moment</h3><p className="mt-2 text-sm text-muted-foreground">Ajoutez un premier élément. Les URL d’images sont facultatives.</p></div>}
          <button onClick={addItem} className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-5 py-3 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground" data-testid={`button-add-${section}`}><Plus size={15} /> Ajouter {sectionLabels[section].toLowerCase()}</button>
        </div>}
         <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-[#e6e3eb] p-4 md:px-6"><div><p className="text-xs font-semibold">Publication immédiate</p><p role={publicationValidationError || update.isError || seoRefreshStatus === 'failed' ? 'alert' : 'status'} className={`mt-1 text-[11px] ${publicationValidationError ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>{publicationValidationError || (update.isError ? update.error.message : seoRefreshMessage || (saved ? 'Le site public affiche les changements.' : 'Publiez pour rendre vos modifications visibles sur le site.'))}</p>{update.error instanceof CmsError && update.error.status === 409 && <button className="mt-3 text-xs font-semibold text-primary underline" onClick={() => void reloadDraft()} data-testid="button-reload-conflict">Recharger la dernière publication</button>}</div><button onClick={publish} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-primary-foreground disabled:opacity-60" data-testid="button-publish-bottom">{busy ? 'Publication…' : 'Publier maintenant'} <ArrowUpRight size={14} /></button></div>
      </main>
    </div>
  </div>;
}

function AdminField({ name, value, onChange, wide = false, protectedUrls, disabled, required = false, helperText }: { name: string; value: unknown; onChange: (value: string) => void; wide?: boolean; protectedUrls: string[]; disabled: boolean; required?: boolean; helperText?: string }) {
  if (['imageUrl', 'logoUrl', 'videoUrl'].includes(name)) return <MediaField value={String(value ?? '')} onChange={onChange} kind={name === 'videoUrl' ? 'video' : 'image'} protectedUrls={protectedUrls} disabled={disabled} />;
  const label = fieldLabels[name] || name;
  const isBool = typeof value === 'boolean';
  const isLong = wide || ['description', 'biography', 'quote', 'answer', 'content', 'excerpt', 'purpose', 'procedureSteps', 'descriptionEn', 'biographyEn', 'answerEn', 'contentEn', 'excerptEn', 'purposeEn', 'procedureStepsEn', 'quoteEn', 'relatedServiceSlugs', 'relatedArticleSlugs'].includes(name);
  const isSelect = name === 'mediaType';
  const isSocialPlatform = name === 'platform';
  const inputType = name === 'publishedAt' ? 'date' : name === 'rating' ? 'number' : name === 'date' ? 'date' : name.toLowerCase().includes('url') ? 'url' : 'text';
  const inputValue = name === 'publishedAt' && typeof value === 'string' ? value.slice(0, 10) : String(value ?? '');
  return <label className={`block text-xs font-medium text-foreground/80 ${wide ? 'md:col-span-2' : ''}`} data-testid={`field-${name}`}>
    <span className="mb-2 block">{label}</span>
    {isBool ? <select disabled={disabled} className="editor-input" value={String(value)} onChange={(event) => onChange(event.target.value)} data-testid={`input-${name}`}><option value="true">Oui</option><option value="false">Non</option></select>
       : isSocialPlatform ? <select disabled={disabled} className="editor-input" value={String(value ?? 'other')} onChange={(event) => onChange(event.target.value)} data-testid={`input-${name}`}><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="snapchat">Snapchat</option><option value="youtube">YouTube</option><option value="linkedin">LinkedIn</option><option value="x">X</option><option value="whatsapp">WhatsApp</option><option value="other">Autre</option></select>
       : isSelect ? <select disabled={disabled} className="editor-input" value={String(value ?? 'image')} onChange={(event) => onChange(event.target.value)} data-testid={`input-${name}`}><option value="image">Image</option><option value="video">Vidéo</option></select>
      : isLong ? <textarea disabled={disabled} rows={name === 'content' ? 8 : 4} className="editor-input resize-y" value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} placeholder={name.toLowerCase().includes('url') ? 'https://…' : ''} data-testid={`input-${name}`} />
      : <input disabled={disabled} required={required} aria-required={required || undefined} className="editor-input" type={inputType} min={name === 'rating' ? 1 : undefined} max={name === 'rating' ? 5 : undefined} value={inputValue} onChange={(event) => onChange(event.target.value)} placeholder={name.toLowerCase().includes('url') ? 'https://…' : ''} data-testid={`input-${name}`} />}
    {helperText && <span className="mt-2 block text-[11px] leading-5 text-muted-foreground">{helperText}</span>}
  </label>;
}
