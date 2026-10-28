import { useEffect, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ArrowUpRight, Check, Image as ImageIcon, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import {
  getGetAdminAccessQueryKey, getGetSiteContentQueryKey, useGetAdminAccess,
  useGetSiteContent, useUpdateSiteContent,
} from '@workspace/api-client-react';
import type { SiteContent } from '@workspace/api-client-react';
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
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}


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
  const access = useGetAdminAccess({ query: { queryKey: getGetAdminAccessQueryKey(), retry: false } });
  const contentQuery = useGetSiteContent({ query: { queryKey: getGetSiteContentQueryKey(), enabled: !!access.data?.isAdmin } });
  const update = useUpdateSiteContent();
  const client = useQueryClient();
  const [draft, setDraft] = useState<SiteContent | null>(null);
  const [section, setSection] = useState<'clinic' | 'hero' | ArraySection>('clinic');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (contentQuery.data) {
      const content = contentQuery.data;
      setDraft((current) => current ?? JSON.parse(JSON.stringify(content)) as SiteContent);
    }
  }, [contentQuery.data]);
  const currentFields = section === 'clinic' ? draft?.clinic : section === 'hero' ? draft?.hero : null;
  const entries = section !== 'clinic' && section !== 'hero' && draft ? draft[section] as unknown as Record<string, unknown>[] : [];
  const busy = update.isPending;
  function setObjectField(key: string, raw: string) {
    if (!draft || !currentFields) return;
    const value = (currentFields as unknown as Record<string, unknown>)[key];
    const nextValue = typeof value === 'number' ? Number(raw) : raw;
    setDraft({ ...draft, [section]: { ...currentFields, [key]: nextValue } } as SiteContent);
    setSaved(false);
  }
  function setArrayField(index: number, key: string, raw: string) {
    if (!draft || section === 'clinic' || section === 'hero') return;
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
    if (!draft || section === 'clinic' || section === 'hero') return;
    const base = newItem[section];
    const item = { ...base, id: `${section}-${Date.now().toString(36)}` };
    setDraft({ ...draft, [section]: [...(draft[section] as unknown as Record<string, unknown>[]), item] } as SiteContent);
    setSaved(false);
  }
  function removeItem(index: number) {
    if (!draft || section === 'clinic' || section === 'hero') return;
    if (!window.confirm('Supprimer cet élément ? Cette action sera appliquée après publication.')) return;
    const next = (draft[section] as unknown as Record<string, unknown>[]).filter((_, i) => i !== index);
    setDraft({ ...draft, [section]: next } as SiteContent);
    setSaved(false);
  }
  function publish() {
    if (!draft) return;
    update.mutate({ data: draft }, {
      onSuccess: (content) => {
        client.setQueryData(getGetSiteContentQueryKey(), content);
        client.invalidateQueries({ queryKey: getGetAdminAccessQueryKey() });
        setDraft(JSON.parse(JSON.stringify(content)) as SiteContent);
        setSaved(true);
      },
    });
  }
  if (access.isLoading) return <div className="min-h-[100dvh] bg-[#f4f6fa] p-6"><div className="mx-auto max-w-6xl"><div className="h-12 w-48 animate-pulse rounded bg-secondary" /><div className="mt-8 h-[420px] animate-pulse rounded-3xl bg-secondary/60" /></div></div>;
  if (access.isError || !access.data?.isAdmin) return <div className="flex min-h-[100dvh] items-center justify-center bg-[#f4f6fa] px-5"><div className="max-w-md rounded-[30px] border border-border bg-card p-9 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary"><ShieldCheck size={24} /></span><h1 className="mt-5 font-display text-3xl">Espace réservé</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Connectez-vous avec un compte administrateur autorisé pour modifier le site.</p><Link href="/sign-in" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-wide text-primary-foreground" data-testid="link-admin-signin">Accéder à la connexion</Link><Link href="/" className="mt-4 block text-xs text-primary" data-testid="link-admin-home">Retour au site</Link></div></div>;
  if (contentQuery.isError) return <div className="mx-auto max-w-3xl px-5 py-20"><FetchError retry={() => void contentQuery.refetch()} /></div>;
  if (contentQuery.isLoading || !draft) return <div className="min-h-[100dvh] bg-[#f4f6fa] p-6"><div className="mx-auto max-w-6xl"><div className="h-12 w-56 animate-pulse rounded bg-secondary" /><div className="mt-8 h-96 animate-pulse rounded-3xl bg-secondary/60" /></div></div>;
  return <div className="min-h-[100dvh] bg-[#f5f1e8] text-foreground">
    <header className="sticky top-0 z-20 border-b border-border bg-[#f5f1e8]/95 backdrop-blur"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4 md:px-8"><div><p className="text-[9px] font-bold uppercase tracking-[.23em] text-primary">Cabinet Naya · Édition</p><h1 className="mt-1 font-display text-xl md:text-2xl">Espace de publication</h1></div><div className="flex items-center gap-3"><Link href="/" className="hidden text-xs text-muted-foreground hover:text-primary sm:block" data-testid="link-admin-preview">Voir le site <ArrowUpRight className="ml-1 inline" size={13} /></Link><button onClick={publish} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-primary-foreground disabled:opacity-60" data-testid="button-publish-site">{busy ? 'Publication…' : saved ? <><Check size={14} /> Publié</> : 'Publier les changements'} <ArrowUpRight size={14} /></button></div></div></header>
    <div className="mx-auto grid max-w-[1500px] gap-7 px-4 py-6 md:grid-cols-[220px_1fr] md:px-8 md:py-9">
      <aside className="md:sticky md:top-[90px] md:h-fit"><div className="flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible">
        {[['clinic', 'Cabinet'], ['hero', 'Accueil'], ...sections.map((item) => [item.key, item.label] as const)].map(([key, label]) => <button key={key} onClick={() => setSection(key as typeof section)} className={`shrink-0 rounded-full px-4 py-3 text-left text-xs font-medium transition-colors md:w-full md:rounded-xl ${section === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`} data-testid={`button-admin-tab-${key}`}>{label}</button>)}
      </div><p className="mt-6 hidden rounded-2xl border border-border bg-card p-4 text-[11px] leading-5 text-muted-foreground md:block">Les changements sont enregistrés ensemble et deviennent visibles dès leur publication.</p></aside>
      <main className="min-w-0">
        <div className="mb-6 flex flex-col justify-between gap-2 md:flex-row md:items-end"><div><p className="text-[10px] uppercase tracking-[.2em] text-primary">{section === 'clinic' ? 'Coordonnées & identité' : section === 'hero' ? 'Première impression' : sections.find((entry) => entry.key === section)?.label}</p><h2 className="mt-2 font-display text-3xl md:text-4xl">{section === 'clinic' ? 'Informations du cabinet' : section === 'hero' ? 'Contenu de l’accueil' : sections.find((entry) => entry.key === section)?.label}</h2></div><p className="text-xs text-muted-foreground">Modifications non publiées : enregistrées dans cette session</p></div>
        {section === 'testimonials' && <div className="mb-5 rounded-2xl border border-[#d8aa88]/50 bg-[#f0e4d9] p-4 text-xs leading-5 text-[#604d3c]" data-testid="notice-admin-sample-content"><b>Avant lancement :</b> témoignages, articles et textes d’exemple doivent être remplacés et vérifiés. Les avis ne doivent être publiés qu’avec l’accord des personnes concernées.</div>}
        {(section === 'clinic' || section === 'hero') && <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(currentFields || {}).map(([key, value]) => <AdminField key={`${section}-${key}`} name={key} value={value} onChange={(raw) => setObjectField(key, raw)} wide={key === 'description' || key === 'openingHours'} />)}
        </div>}
        {section !== 'clinic' && section !== 'hero' && <div className="space-y-5">
          {entries.map((item, index) => <section key={String(item.id ?? index)} className="rounded-[22px] border border-border bg-card p-5 md:p-6" data-testid={`admin-entry-${section}-${String(item.id ?? index)}`}>
            <div className="mb-5 flex items-center justify-between border-b border-border pb-4"><div><p className="text-[9px] uppercase tracking-[.18em] text-muted-foreground">{sections.find((entry) => entry.key === section)?.label} · {String(item.id || `Élément ${index + 1}`)}</p><h3 className="mt-1 font-display text-xl">{String(item.title || item.name || item.question || `Élément ${index + 1}`)}</h3></div><button type="button" onClick={() => removeItem(index)} aria-label="Supprimer cet élément" className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive" data-testid={`button-remove-${section}-${index}`}><Trash2 size={16} /></button></div>
            <div className="grid gap-4 md:grid-cols-2">{Object.entries(item).map(([key, value]) => <AdminField key={`${String(item.id)}-${key}`} name={key} value={value} onChange={(raw) => setArrayField(index, key, raw)} wide={['description', 'biography', 'quote', 'answer', 'content', 'excerpt'].includes(key)} />)}</div>
            {typeof item.imageUrl === 'string' && item.imageUrl && <div className="mt-4"><p className="mb-2 text-[10px] uppercase tracking-[.16em] text-muted-foreground">Aperçu</p><ImageFrame src={item.imageUrl} alt="Aperçu du visuel" className="h-48 rounded-xl" /> </div>}
          </section>)}
          {!entries.length && <div className="rounded-[22px] border border-dashed border-border bg-card/60 p-10 text-center" data-testid={`empty-admin-${section}`}><ImageIcon className="mx-auto text-primary/70" size={24} /><h3 className="mt-4 font-display text-xl">Aucun élément pour le moment</h3><p className="mt-2 text-sm text-muted-foreground">Ajoutez un premier élément. Les URL d’images sont facultatives.</p></div>}
          <button onClick={addItem} className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-5 py-3 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground" data-testid={`button-add-${section}`}><Plus size={15} /> Ajouter {sections.find((entry) => entry.key === section)?.label.toLowerCase()}</button>
        </div>}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-[#eee8dc] p-4 md:px-6"><div><p className="text-xs font-semibold">Publication immédiate</p><p className="mt-1 text-[11px] text-muted-foreground">{update.isError ? 'La publication a échoué. Vérifiez votre connexion et réessayez.' : saved ? 'Le site public affiche les changements.' : 'Publiez pour rendre vos modifications visibles sur le site.'}</p></div><button onClick={publish} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-[10px] font-bold uppercase tracking-[.13em] text-primary-foreground disabled:opacity-60" data-testid="button-publish-bottom">{busy ? 'Publication…' : 'Publier maintenant'} <ArrowUpRight size={14} /></button></div>
      </main>
    </div>
  </div>;
}

function AdminField({ name, value, onChange, wide = false }: { name: string; value: unknown; onChange: (value: string) => void; wide?: boolean }) {
  const label = fieldLabels[name] || name;
  const isBool = typeof value === 'boolean';
  const isLong = wide || ['description', 'biography', 'quote', 'answer', 'content', 'excerpt'].includes(name);
  const isSelect = name === 'mediaType';
  return <label className={`block text-xs font-medium text-foreground/80 ${wide ? 'md:col-span-2' : ''}`} data-testid={`field-${name}`}>
    <span className="mb-2 block">{label}</span>
    {isBool ? <select className="editor-input" value={String(value)} onChange={(event) => onChange(event.target.value)} data-testid={`input-${name}`}><option value="true">Oui</option><option value="false">Non</option></select>
      : isSelect ? <select className="editor-input" value={String(value ?? 'image')} onChange={(event) => onChange(event.target.value)} data-testid={`input-${name}`}><option value="image">Image</option><option value="video">Vidéo</option></select>
      : isLong ? <textarea rows={name === 'content' ? 8 : 4} className="editor-input resize-y" value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} placeholder={name.toLowerCase().includes('url') ? 'https://…' : ''} data-testid={`input-${name}`} />
      : <input className="editor-input" type={name === 'rating' ? 'number' : name === 'date' ? 'date' : name.toLowerCase().includes('url') ? 'url' : 'text'} min={name === 'rating' ? 1 : undefined} max={name === 'rating' ? 5 : undefined} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} placeholder={name.toLowerCase().includes('url') ? 'https://…' : ''} data-testid={`input-${name}`} />}
  </label>;
}

function SignInPage() {
  if (!clerkPubKey) return <AuthUnavailable />;
  return <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthFrame>;
}

function SignUpPage() {
  if (!clerkPubKey) return <AuthUnavailable />;
  return <AuthFrame><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthFrame>;
}

function AuthUnavailable() {
  return <AuthFrame><div className="w-full max-w-md rounded-[24px] border border-border bg-card p-8 text-center"><h1 className="font-display text-3xl">Connexion indisponible</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">L’authentification du cabinet doit être configurée avant de pouvoir ouvrir une session.</p><Link href="/" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-xs font-semibold uppercase tracking-wide text-primary-foreground" data-testid="link-auth-home">Retour au site</Link></div></AuthFrame>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId.current !== undefined && previousUserId.current !== userId) client.clear();
      previousUserId.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);
  return null;
}

function AuthFrame({ children }: { children: ReactNode }) {
  return <main className="grid min-h-[100dvh] bg-background md:grid-cols-[.85fr_1fr]">
    <aside className="relative hidden overflow-hidden bg-[#0f1f3d] p-12 text-[#f6f4ee] md:flex md:flex-col md:justify-between lg:p-16"><LogoWordmark inverse /><div className="relative z-10"><p className="text-[10px] uppercase tracking-[.25em] text-[#d6b56f]">Votre espace Naya</p><p className="mt-5 max-w-lg font-display text-5xl leading-tight">La confiance commence par une présence attentive.</p><p className="mt-5 max-w-sm text-sm leading-7 text-white/65">Accédez à votre espace sécurisé ou créez votre compte en quelques instants.</p></div><p className="text-[10px] tracking-wide text-white/50">Cabinet Naya · Douala, Cameroun</p></aside>
    <div className="flex flex-col items-center justify-center px-5 py-12"><div className="mb-6 md:hidden"><LogoWordmark /></div>{children}</div>
  </main>;
}

function PublicRoute({ page }: { page: (content: SiteContent) => ReactNode }) {
  const query = useGetSiteContent();
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
    <Route path="/admin" component={AdminPage} />
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route component={NotFound} />
  </Switch></RouteErrorBoundary>;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#0f1f3d', colorForeground: '#14213d', colorMutedForeground: '#5f6b80',
    colorDanger: '#b3473d', colorBackground: '#fbfaf7', colorInput: '#f4f6fa',
    colorInputForeground: '#14213d', colorNeutral: '#d5dbe6',
    fontFamily: "'DM Sans', sans-serif", borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fbfaf7] rounded-[24px] w-[440px] max-w-full overflow-hidden border border-[#d5dbe6] shadow-none',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#14213d] font-semibold tracking-tight',
    headerSubtitle: 'text-[#5f6b80]',
    socialButtonsBlockButtonText: 'text-[#14213d] font-medium',
    formFieldLabel: 'text-[#14213d] font-medium',
    footerActionLink: 'text-[#0f1f3d] font-semibold',
    footerActionText: 'text-[#5f6b80]',
    dividerText: 'text-[#5f6b80]',
    identityPreviewEditButton: 'text-[#0f1f3d]',
    formFieldSuccessText: 'text-[#0f1f3d]',
    alertText: 'text-[#943d35]',
    logoBox: 'rounded-full overflow-hidden',
    logoImage: 'rounded-full',
    socialButtonsBlockButton: 'border-[#d5dbe6] bg-[#f4f6fa] hover:bg-[#e9edf4]',
    formButtonPrimary: 'bg-[#0f1f3d] hover:bg-[#1a2f57] text-[#fbfaf7] shadow-none',
    formFieldInput: 'bg-[#f4f6fa] border-[#d5dbe6] text-[#14213d]',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-[#d5dbe6]',
    alert: 'bg-[#f8e9e5] border-[#e7c8c1]',
    otpCodeFieldInput: 'bg-[#f4f6fa] border-[#d5dbe6]',
    formFieldRow: 'gap-2',
    main: 'gap-4',
  },
};

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  if (!clerkPubKey) return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>;
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Ravi de vous retrouver', subtitle: 'Connectez-vous à votre espace sécurisé', actionText: 'Vous n’avez pas encore de compte ?', actionLink: 'Créer un compte' } },
        signUp: { start: { title: 'Bienvenue chez Naya', subtitle: 'Créez votre espace en quelques instants', actionText: 'Vous avez déjà un compte ?', actionLink: 'Se connecter' } },
        formFieldLabel__emailAddress: 'Adresse e-mail',
        formFieldLabel__password: 'Mot de passe',
        formButtonPrimary: 'Continuer',
        socialButtonsBlockButton: 'Continuer avec {{provider}}',
      }}
      routerPush={(to: string) => setLocation(stripBase(to))}
      routerReplace={(to: string) => setLocation(stripBase(to), { replace: true })}>
      <QueryClientProvider client={queryClient}><TooltipProvider><ClerkQueryClientCacheInvalidator /><Router /><Toaster /></TooltipProvider></QueryClientProvider>
    </ClerkProvider>;
}

function App() {
  return <WouterRouter base={basePath}><ClerkProviderWithRoutes /></WouterRouter>;
}

export default App;
