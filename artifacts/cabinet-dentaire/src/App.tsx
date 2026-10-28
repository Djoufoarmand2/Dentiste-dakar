import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Check, Image as ImageIcon, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { SiteContent } from '@workspace/api-client-react';
import { AuthProvider, useCabinetSession } from '@/components/auth-provider';
import { AuthPage } from '@/components/supabase-auth';
import { MediaField } from '@/components/media-field';
import { adminAccessKey, adminContentKey, collectMediaUrls, publicContentKey, useAdminAccess, useAdminContent, usePublicContent, usePublishContent } from '@/lib/cms';
import { CmsError, supabase } from '@/lib/supabase';
import {
  BlogArticlePage, BlogPage, ContactPage, FAQPage, FetchError, Footer, GalleryPage, Header, HomePage,
  ImageFrame, InformationPage, LoadingPage, LogoWordmark, ReviewsPage, ServicesPage, TeamPage,
} from '@/components/public-site';
import { Route, Switch, Link, Router as WouterRouter, useLocation } from 'wouter';
import NotFound from '@/pages/not-found';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');


type ArraySection = 'services' | 'team' | 'gallery' | 'testimonials' | 'faqs' | 'blogPosts' | 'campaigns';
const sections: { key: ArraySection; label: string; help: string }[] = [
  { key: 'services', label: 'Soins', help: 'Présentation des soins et images associées.' },
  { key: 'team', label: 'Équipe', help: 'Profils et photos de présentation.' },
  { key: 'gallery', label: 'Galerie', help: 'Images du cabinet et textes alternatifs.' },
  { key: 'testimonials', label: 'Avis', help: 'Témoignages à remplacer par des retours réels avant lancement.' },
  { key: 'faqs', label: 'FAQ', help: 'Questions et réponses visibles sur le site.' },
  { key: 'blogPosts', label: 'Blog', help: 'Articles publiés ou gardés en brouillon.' },
  { key: 'campaigns', label: 'Campagnes', help: 'Informations illustrées ou vidéos.' },
];

const newItem: Record<ArraySection, Record<string, unknown>> = {
  services: { id: '', title: '', slug: '', summary: '', description: '', imageUrl: '' },
  team: { id: '', name: '', role: '', biography: '', imageUrl: '' },
  gallery: { id: '', alt: '', imageUrl: '' },
  testimonials: { id: '', name: '', service: '', quote: '', rating: 5 },
  faqs: { id: '', question: '', answer: '' },
  blogPosts: { id: '', title: '', slug: '', excerpt: '', content: '', imageUrl: '', author: '', date: new Date().toISOString().slice(0, 10), published: false },
  campaigns: { id: '', title: '', description: '', mediaType: 'image', imageUrl: '', videoUrl: null, active: false },
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
};

function AdminPage() {
  const { session } = useCabinetSession();
  const access = useAdminAccess();
  const contentQuery = useAdminContent(!!access.data?.isAdmin);
  const update = usePublishContent();
  const client = useQueryClient();
  const [draft, setDraft] = useState<SiteContent | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [section, setSection] = useState<'clinic' | 'hero' | ArraySection>('clinic');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (contentQuery.data && draft === null) {
      setDraft(JSON.parse(JSON.stringify(contentQuery.data.content)) as SiteContent);
      setVersion(contentQuery.data.version);
    }
  }, [contentQuery.data, draft]);
  const currentFields = section === 'clinic' ? draft?.clinic : section === 'hero' ? draft?.hero : null;
  const entries = section !== 'clinic' && section !== 'hero' && draft ? draft[section] as unknown as Record<string, unknown>[] : [];
  const busy = update.isPending;
  const protectedUrls = collectMediaUrls(draft);
  function setObjectField(key: string, raw: string) {
    if (busy || !draft || !currentFields) return;
    const value = (currentFields as unknown as Record<string, unknown>)[key];
    const nextValue = typeof value === 'number' ? Number(raw) : raw;
    setDraft({ ...draft, [section]: { ...currentFields, [key]: nextValue } } as SiteContent);
    setSaved(false);
  }
  function setArrayField(index: number, key: string, raw: string) {
    if (busy || !draft || section === 'clinic' || section === 'hero') return;
    const current = [...(draft[section] as unknown as Record<string, unknown>[])];
    const value = current[index][key];
    let nextValue: unknown = raw;
    if (typeof value === 'number') nextValue = Number(raw);
    if (typeof value === 'boolean') nextValue = raw === 'true';
    if (key === 'videoUrl' && raw.trim() === '') nextValue = null;
    current[index] = { ...current[index], [key]: nextValue };
    setDraft({ ...draft, [section]: current } as SiteContent);
    setSaved(false);
  }
  function addItem() {
    if (busy || !draft || section === 'clinic' || section === 'hero') return;
    const base = newItem[section];
    const item = { ...base, id: `${section}-${Date.now().toString(36)}` };
    setDraft({ ...draft, [section]: [...(draft[section] as unknown as Record<string, unknown>[]), item] } as SiteContent);
    setSaved(false);
  }
  function removeItem(index: number) {
    if (busy || !draft || section === 'clinic' || section === 'hero') return;
    if (!window.confirm('Supprimer cet élément ? Cette action sera appliquée après publication.')) return;
    const next = (draft[section] as unknown as Record<string, unknown>[]).filter((_, i) => i !== index);
    setDraft({ ...draft, [section]: next } as SiteContent);
    setSaved(false);
  }
  function publish() {
    if (!draft || version === null) return;
    update.mutate({ content: draft, expectedVersion: version }, {
      onSuccess: (document) => {
        client.setQueryData([...adminContentKey, session?.user.id], document);
        void client.invalidateQueries({ queryKey: publicContentKey });
        void client.invalidateQueries({ queryKey: adminAccessKey });
        setDraft(JSON.parse(JSON.stringify(document.content)) as SiteContent);
        setVersion(document.version);
        setSaved(true);
      },
    });
  }
  async function reloadDraft() {
    if (!window.confirm('Recharger la dernière publication ? Les modifications non publiées affichées ici seront abandonnées.')) return;
    const result = await contentQuery.refetch();
    if (result.data) { setDraft(structuredClone(result.data.content)); setVersion(result.data.version); setSaved(false); update.reset(); }
  }
  if (access.isLoading) return <div className="min-h-[100dvh] bg-[#e6e3eb] p-6"><div className="mx-auto max-w-6xl"><div className="h-12 w-48 animate-pulse rounded bg-secondary" /><div className="mt-8 h-[420px] animate-pulse rounded-3xl bg-secondary/60" /></div></div>;
  if (access.isError || !access.data?.isAdmin) return <div className="flex min-h-[100dvh] items-center justify-center bg-[#e6e3eb] px-5"><div className="max-w-md rounded-[30px] border border-border bg-card p-9 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary"><ShieldCheck size={24} /></span><h1 className="mt-5 font-display text-3xl">Espace réservé</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Connectez-vous avec un compte administrateur autorisé pour modifier le site.</p><Link href="/sign-in" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-wide text-primary-foreground" data-testid="link-admin-signin">Accéder à la connexion</Link><Link href="/" className="mt-4 block text-xs text-primary" data-testid="link-admin-home">Retour au site</Link></div></div>;
  if (contentQuery.isError) return <div className="mx-auto max-w-3xl px-5 py-20"><FetchError retry={() => void contentQuery.refetch()} /></div>;
  if (contentQuery.isLoading || !draft) return <div className="min-h-[100dvh] bg-[#e6e3eb] p-6"><div className="mx-auto max-w-6xl"><div className="h-12 w-56 animate-pulse rounded bg-secondary" /><div className="mt-8 h-96 animate-pulse rounded-3xl bg-secondary/60" /></div></div>;
  return <div className="min-h-[100dvh] bg-[#e6e3eb] text-foreground">
    <header className="sticky top-0 z-20 border-b border-border bg-[#e6e3eb]/95 backdrop-blur"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8"><div><p className="text-[9px] font-bold uppercase tracking-[.23em] text-primary">Cabinet Naya · Édition</p><h1 className="mt-1 font-display text-xl md:text-2xl">Espace de publication</h1></div><div className="flex flex-wrap items-center gap-3"><Link href="/" className="hidden text-xs text-muted-foreground hover:text-primary sm:block" data-testid="link-admin-preview">Voir le site <ArrowUpRight className="ml-1 inline" size={13} /></Link><Link href="/sign-in" className="text-xs text-primary" data-testid="link-admin-account">Mon compte / déconnexion</Link><button onClick={publish} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-primary-foreground disabled:opacity-60" data-testid="button-publish-site">{busy ? 'Publication…' : saved ? <><Check size={14} /> Publié</> : 'Publier les changements'} <ArrowUpRight size={14} /></button></div></div></header>
    <div className="mx-auto grid max-w-[1500px] gap-7 px-4 py-6 md:grid-cols-[220px_1fr] md:px-8 md:py-9">
      <aside className="md:sticky md:top-[90px] md:h-fit"><div className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible">
        {[['clinic', 'Cabinet'], ['hero', 'Accueil'], ...sections.map((item) => [item.key, item.label] as const)].map(([key, label]) => <button key={key} onClick={() => setSection(key as typeof section)} className={`shrink-0 rounded-full px-4 py-3 text-left text-xs font-medium transition-colors md:w-full md:rounded-xl ${section === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`} data-testid={`button-admin-tab-${key}`}>{label}</button>)}
      </div><p className="mt-6 hidden rounded-2xl border border-border bg-card p-4 text-[11px] leading-5 text-muted-foreground md:block">Les changements sont enregistrés ensemble et deviennent visibles dès leur publication.</p></aside>
      <main className="min-w-0">
        <div className="mb-6 flex flex-col justify-between gap-2 md:flex-row md:items-end"><div><p className="text-[10px] uppercase tracking-[.2em] text-primary">{section === 'clinic' ? 'Coordonnées & identité' : section === 'hero' ? 'Première impression' : sections.find((entry) => entry.key === section)?.label}</p><h2 className="mt-2 font-display text-3xl md:text-4xl">{section === 'clinic' ? 'Informations du cabinet' : section === 'hero' ? 'Contenu de l’accueil' : sections.find((entry) => entry.key === section)?.label}</h2></div><p className="text-xs text-muted-foreground">Modifications non publiées : enregistrées dans cette session</p></div>
        {section === 'testimonials' && <div className="mb-5 rounded-2xl border border-[#8c6f0b]/50 bg-[#e6e3eb] p-4 text-xs leading-5 text-[#070116]" data-testid="notice-admin-sample-content"><b>Avant lancement :</b> témoignages, articles et textes d’exemple doivent être remplacés et vérifiés. Les avis ne doivent être publiés qu’avec l’accord des personnes concernées.</div>}
        {(section === 'clinic' || section === 'hero') && <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(currentFields || {}).map(([key, value]) => <AdminField key={`${section}-${key}`} name={key} value={value} onChange={(raw) => setObjectField(key, raw)} wide={key === 'description' || key === 'openingHours'} protectedUrls={protectedUrls} disabled={busy} />)}
        </div>}
        {section !== 'clinic' && section !== 'hero' && <div className="space-y-5">
          {entries.map((item, index) => <section key={String(item.id ?? index)} className="rounded-[22px] border border-border bg-card p-5 md:p-6" data-testid={`admin-entry-${section}-${String(item.id ?? index)}`}>
            <div className="mb-5 flex items-center justify-between border-b border-border pb-4"><div><p className="text-[9px] uppercase tracking-[.18em] text-muted-foreground">{sections.find((entry) => entry.key === section)?.label} · {String(item.id || `Élément ${index + 1}`)}</p><h3 className="mt-1 font-display text-xl">{String(item.title || item.name || item.question || `Élément ${index + 1}`)}</h3></div><button type="button" onClick={() => removeItem(index)} aria-label="Supprimer cet élément" className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive" data-testid={`button-remove-${section}-${index}`}><Trash2 size={16} /></button></div>
            <div className="grid gap-4 md:grid-cols-2">{Object.entries(item).map(([key, value]) => <AdminField key={`${String(item.id)}-${key}`} name={key} value={value} onChange={(raw) => setArrayField(index, key, raw)} wide={['description', 'biography', 'quote', 'answer', 'content', 'excerpt'].includes(key)} protectedUrls={protectedUrls} disabled={busy} />)}</div>
            {typeof item.imageUrl === 'string' && item.imageUrl && <div className="mt-4"><p className="mb-2 text-[10px] uppercase tracking-[.16em] text-muted-foreground">Aperçu</p><ImageFrame src={item.imageUrl} alt="Aperçu du visuel" className="h-48 rounded-xl" /> </div>}
          </section>)}
          {!entries.length && <div className="rounded-[22px] border border-dashed border-border bg-card/60 p-10 text-center" data-testid={`empty-admin-${section}`}><ImageIcon className="mx-auto text-primary/70" size={24} /><h3 className="mt-4 font-display text-xl">Aucun élément pour le moment</h3><p className="mt-2 text-sm text-muted-foreground">Ajoutez un premier élément. Les URL d’images sont facultatives.</p></div>}
          <button onClick={addItem} className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-5 py-3 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground" data-testid={`button-add-${section}`}><Plus size={15} /> Ajouter {sections.find((entry) => entry.key === section)?.label.toLowerCase()}</button>
        </div>}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-[#e6e3eb] p-4 md:px-6"><div><p className="text-xs font-semibold">Publication immédiate</p><p role={update.isError ? 'alert' : 'status'} className="mt-1 text-[11px] text-muted-foreground">{update.isError ? update.error.message : saved ? 'Le site public affiche les changements.' : 'Publiez pour rendre vos modifications visibles sur le site.'}</p>{update.error instanceof CmsError && update.error.status === 409 && <button className="mt-3 text-xs font-semibold text-primary underline" onClick={() => void reloadDraft()} data-testid="button-reload-conflict">Recharger la dernière publication</button>}</div><button onClick={publish} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-primary-foreground disabled:opacity-60" data-testid="button-publish-bottom">{busy ? 'Publication…' : 'Publier maintenant'} <ArrowUpRight size={14} /></button></div>
      </main>
    </div>
  </div>;
}

function AdminField({ name, value, onChange, wide = false, protectedUrls, disabled }: { name: string; value: unknown; onChange: (value: string) => void; wide?: boolean; protectedUrls: string[]; disabled: boolean }) {
  if (['imageUrl', 'logoUrl', 'videoUrl'].includes(name)) return <MediaField value={String(value ?? '')} onChange={onChange} kind={name === 'videoUrl' ? 'video' : 'image'} protectedUrls={protectedUrls} disabled={disabled} />;
  const label = fieldLabels[name] || name;
  const isBool = typeof value === 'boolean';
  const isLong = wide || ['description', 'biography', 'quote', 'answer', 'content', 'excerpt'].includes(name);
  const isSelect = name === 'mediaType';
  return <label className={`block text-xs font-medium text-foreground/80 ${wide ? 'md:col-span-2' : ''}`} data-testid={`field-${name}`}>
    <span className="mb-2 block">{label}</span>
    {isBool ? <select disabled={disabled} className="editor-input" value={String(value)} onChange={(event) => onChange(event.target.value)} data-testid={`input-${name}`}><option value="true">Oui</option><option value="false">Non</option></select>
      : isSelect ? <select disabled={disabled} className="editor-input" value={String(value ?? 'image')} onChange={(event) => onChange(event.target.value)} data-testid={`input-${name}`}><option value="image">Image</option><option value="video">Vidéo</option></select>
      : isLong ? <textarea disabled={disabled} rows={name === 'content' ? 8 : 4} className="editor-input resize-y" value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} placeholder={name.toLowerCase().includes('url') ? 'https://…' : ''} data-testid={`input-${name}`} />
      : <input disabled={disabled} className="editor-input" type={name === 'rating' ? 'number' : name === 'date' ? 'date' : name.toLowerCase().includes('url') ? 'url' : 'text'} min={name === 'rating' ? 1 : undefined} max={name === 'rating' ? 5 : undefined} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} placeholder={name.toLowerCase().includes('url') ? 'https://…' : ''} data-testid={`input-${name}`} />}
  </label>;
}

function PublicRoute({ page }: { page: (content: SiteContent) => ReactNode }) {
  const query = usePublicContent();
  const [location] = useLocation();
  if (query.isLoading) return <div className="min-h-[100dvh] bg-background"><Header /><LoadingPage /><Footer /></div>;
  if (query.isError || !query.data) return <div className="min-h-[100dvh] bg-background"><Header /><FetchError retry={() => void query.refetch()} /><Footer /></div>;
  const path = location.split('?')[0] || '/';
  const pathParts = path.split('/').filter(Boolean);
  const article = pathParts[0] === 'blog'
    ? query.data.blogPosts.find((post) => post.slug === pathParts[1] && post.published)
    : undefined;
  const pageNames: Record<string, string> = {
    '/': 'Accueil',
    '/soins': 'Soins dentaires',
    '/equipe': 'Notre équipe',
    '/galerie': 'Le cabinet',
    '/avis': 'Avis',
    '/faq': 'Questions fréquentes',
    '/blog': 'Conseils dentaires',
    '/informations': 'Informations',
    '/contact': 'Contact',
  };
  const pageName = article?.title || pageNames[path] || 'Cabinet dentaire';
  const description = article?.excerpt ||
    (path === '/'
      ? query.data.hero.description
      : `${pageName} au ${query.data.clinic.name}, à ${query.data.clinic.city}. Informations, conseils et contact.`);
  const title = path === '/'
    ? `${query.data.clinic.name} | Cabinet dentaire à ${query.data.clinic.city}`
    : `${pageName} | ${query.data.clinic.name}`;
  return <><DocumentMetadata title={title} description={description} />{page(query.data)}</>;
}

function DocumentMetadata({ title, description }: { title: string; description: string }) {
  useEffect(() => {
    document.title = title;
    const tags = [
      { selector: 'meta[name="description"]', attribute: 'name', key: 'description', content: description },
      { selector: 'meta[property="og:title"]', attribute: 'property', key: 'og:title', content: title },
      { selector: 'meta[property="og:description"]', attribute: 'property', key: 'og:description', content: description },
      { selector: 'meta[property="og:url"]', attribute: 'property', key: 'og:url', content: `${window.location.origin}${window.location.pathname}` },
      { selector: 'meta[name="twitter:title"]', attribute: 'name', key: 'twitter:title', content: title },
      { selector: 'meta[name="twitter:description"]', attribute: 'name', key: 'twitter:description', content: description },
    ];
    for (const tag of tags) {
      let element = document.head.querySelector<HTMLMetaElement>(tag.selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(tag.attribute, tag.key);
        document.head.appendChild(element);
      }
      element.content = tag.content;
    }
  }, [description, title]);

  return null;
}

function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function AdminRoute() {
  const { session } = useCabinetSession();
  return <AdminPage key={session?.user.id ?? 'anonymous'} />;
}

function Router() {
  return <RouteErrorBoundary><Switch>
    <Route path="/" component={() => <PublicRoute page={(content) => <HomePage content={content} />} />} />
    <Route path="/soins" component={() => <PublicRoute page={(content) => <ServicesPage content={content} />} />} />
    <Route path="/equipe" component={() => <PublicRoute page={(content) => <TeamPage content={content} />} />} />
    <Route path="/galerie" component={() => <PublicRoute page={(content) => <GalleryPage content={content} />} />} />
    <Route path="/avis" component={() => <PublicRoute page={(content) => <ReviewsPage content={content} />} />} />
    <Route path="/faq" component={() => <PublicRoute page={(content) => <FAQPage content={content} />} />} />
    <Route path="/blog" component={() => <PublicRoute page={(content) => <BlogPage content={content} />} />} />
    <Route path="/blog/:slug" component={({ params }) => <PublicRoute page={(content) => <BlogArticlePage content={content} slug={params.slug} />} />} />
    <Route path="/informations" component={() => <PublicRoute page={(content) => <InformationPage content={content} />} />} />
    <Route path="/contact" component={() => <PublicRoute page={(content) => <ContactPage content={content} />} />} />
    <Route path="/admin" component={AdminRoute} />
    <Route path="/sign-in/*?" component={() => <AuthPage mode="signin" />} />
    <Route path="/sign-up/*?" component={() => <AuthPage mode="signup" />} />
    <Route path="/forgot-password" component={() => <AuthPage mode="recover" />} />
    <Route path="/auth/callback" component={() => <AuthPage mode="reset" />} />
    <Route component={NotFound} />
  </Switch></RouteErrorBoundary>;
}

function App() {
  return <WouterRouter base={basePath}><QueryClientProvider client={queryClient}><AuthProvider><TooltipProvider><Router /><Toaster /></TooltipProvider></AuthProvider></QueryClientProvider></WouterRouter>;
}

export default App;
