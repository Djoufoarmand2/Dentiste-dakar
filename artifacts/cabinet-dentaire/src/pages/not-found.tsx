import { useEffect } from 'react';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Link } from 'wouter';
import { SiteShell } from '@/components/public-site';

export default function NotFound() {
  useEffect(() => {
    document.title = 'Page introuvable | Cabinet dentaire';
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex, nofollow';
    document.head.querySelector('link[rel="canonical"]')?.remove();
    document.head.querySelector('meta[property="og:url"]')?.remove();
  }, []);

  return <SiteShell>
    <main id="contenu-principal" className="grid min-h-[55vh] place-items-center bg-background px-5 py-20">
      <section className="max-w-xl text-center" aria-labelledby="not-found-title">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#e6e3eb] text-[#073e53]">
          <SearchX size={27} aria-hidden="true" />
        </span>
        <p className="mt-7 text-[11px] font-semibold uppercase tracking-[.24em] text-[#8c6f0b]">Erreur 404</p>
        <h1 id="not-found-title" className="mt-3 font-display text-4xl font-semibold text-[#070116] md:text-5xl">Page introuvable</h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-muted-foreground">Cette adresse n’existe pas ou a été déplacée. Vous pouvez revenir à l’accueil et poursuivre votre visite.</p>
        <Link href="/" className="btn-navy mt-8 inline-flex items-center gap-2" data-testid="link-not-found-home">
          <ArrowLeft size={16} aria-hidden="true" /> Retour à l’accueil
        </Link>
      </section>
    </main>
  </SiteShell>;
}
