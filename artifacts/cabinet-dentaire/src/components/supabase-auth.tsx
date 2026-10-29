import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { useCabinetSession } from '@/components/auth-provider';
import { LogoWordmark } from '@/components/public-site';

type Mode = 'signin' | 'recover' | 'signup' | 'reset';

function callbackUrl() {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${window.location.origin}${base}/auth/callback`;
}

function translate(message: string) {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Adresse e-mail ou mot de passe incorrect.';
  if (m.includes('email not confirmed')) return 'Votre adresse e-mail n’est pas encore confirmée.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Patientez quelques minutes puis réessayez.';
  if (m.includes('same') && m.includes('password')) return 'Le nouveau mot de passe doit être différent de l’ancien.';
  if (m.includes('weak') || m.includes('password should')) return 'Ce mot de passe est trop faible. Choisissez-en un plus long ou plus varié.';
  if (m.includes('fetch') || m.includes('network')) return 'Connexion impossible. Vérifiez votre réseau et réessayez.';
  return message || 'Une erreur est survenue. Réessayez.';
}

function Frame({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return <main className="grid min-h-[100dvh] bg-background md:grid-cols-[.85fr_1fr]">
    <aside className="relative hidden overflow-hidden bg-[#073e53] p-12 text-[#e6e3eb] md:flex md:flex-col md:justify-between lg:p-16">
      <LogoWordmark inverse />
      <div><p className="text-[10px] uppercase tracking-[.25em] text-[#f0a0a6]">Espace de publication</p><p className="mt-5 max-w-lg font-display text-5xl leading-tight">La confiance commence par une présence attentive.</p><p className="mt-5 max-w-sm text-sm leading-7 text-white/70">Accès réservé à l’équipe du cabinet, sur invitation.</p></div>
      <p className="text-[10px] tracking-wide text-white/55">Cabinet Naya · Douala, Cameroun</p>
    </aside>
    <div className="flex flex-col items-center justify-center px-5 py-12">
      <div className="mb-6 md:hidden"><LogoWordmark /></div>
      <section className="w-full max-w-md rounded-[24px] border border-border bg-card p-7 md:p-9" aria-labelledby="auth-title">
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-primary">{eyebrow}</p>
        <h1 id="auth-title" className="mt-2 font-display text-3xl">{title}</h1>
        {children}
      </section>
      <Link href="/" className="mt-6 text-xs text-muted-foreground hover:text-primary" data-testid="link-auth-home">Retour au site</Link>
    </div>
  </main>;
}

function Alert({ error, success }: { error: string | null; success?: string | null }) {
  return <>
    {error && <p role="alert" className="mt-4 rounded-xl border border-[#e7c8c1] bg-[#f8e9e5] p-3 text-sm text-[#943d35]" data-testid="text-auth-error">{error}</p>}
    {success && <p role="status" className="mt-4 rounded-xl border border-[#b94f5b]/30 bg-[#f7e9ec] p-3 text-sm text-[#073e53]" data-testid="text-auth-success">{success}</p>}
  </>;
}

function Field({ id, label, ...props }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <div className="mt-4"><label htmlFor={id} className="mb-2 block text-xs font-medium text-foreground/80">{label}</label><input id={id} className="editor-input" required data-testid={`input-${id}`} {...props} /></div>;
}

function SignedInNotice() {
  const { session } = useCabinetSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!session) return null;
  async function logout() {
    setBusy(true); setError(null);
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) setError(translate(error.message));
    setBusy(false);
  }
  return <div className="mt-5 rounded-xl border border-border bg-secondary/50 p-4 text-sm" data-testid="notice-signed-in">
    <p>Session ouverte : <b data-testid="text-session-email">{session.user.email}</b></p>
    <div className="mt-3 flex flex-wrap gap-2">
      <Link href="/admin" className="btn-navy" data-testid="link-go-admin">Ouvrir l’espace</Link>
      <button type="button" onClick={() => void logout()} disabled={busy} className="btn-gold disabled:opacity-60" data-testid="button-logout">{busy ? 'Déconnexion…' : 'Changer de compte'}</button>
    </div>
    <Alert error={error} />
  </div>;
}

function SignIn() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { setError(translate(error.message)); return; }
      setLocation('/admin');
    } catch (err) { setError(translate(err instanceof Error ? err.message : '')); }
    finally { setBusy(false); }
  }
  return <Frame eyebrow="Connexion" title="Ravi de vous retrouver">
    <SignedInNotice />
    <form onSubmit={(e) => void submit(e)} noValidate={false}>
      <Field id="email" label="Adresse e-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field id="password" label="Mot de passe" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Alert error={error} />
      <button type="submit" disabled={busy} className="btn-navy mt-6 w-full justify-center disabled:opacity-60" data-testid="button-signin">{busy ? 'Connexion…' : 'Se connecter'}</button>
    </form>
    <div className="mt-5 flex flex-wrap justify-between gap-2 text-xs">
      <Link href="/forgot-password" className="text-primary hover:underline" data-testid="link-forgot">Mot de passe oublié ?</Link>
      <Link href="/sign-up" className="text-muted-foreground hover:text-primary" data-testid="link-signup-info">Pas encore de compte ?</Link>
    </div>
  </Frame>;
}

function Recover() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null); setSuccess(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: callbackUrl() });
      if (error) { setError(translate(error.message)); return; }
      setSuccess('Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé. Pensez à vérifier vos courriers indésirables.');
    } catch (err) { setError(translate(err instanceof Error ? err.message : '')); }
    finally { setBusy(false); }
  }
  return <Frame eyebrow="Récupération" title="Mot de passe oublié">
    <p className="mt-3 text-sm leading-6 text-muted-foreground">Saisissez l’adresse de votre compte. Vous recevrez un lien pour définir un nouveau mot de passe.</p>
    <form onSubmit={(e) => void submit(e)}>
      <Field id="recover-email" label="Adresse e-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Alert error={error} success={success} />
      <button type="submit" disabled={busy} className="btn-navy mt-6 w-full justify-center disabled:opacity-60" data-testid="button-recover">{busy ? 'Envoi…' : 'Envoyer le lien'}</button>
    </form>
    <Link href="/sign-in" className="mt-5 inline-block text-xs text-primary hover:underline" data-testid="link-back-signin">Retour à la connexion</Link>
  </Frame>;
}

function SignUpInfo() {
  return <Frame eyebrow="Accès sur invitation" title="Création de compte">
    <p className="mt-3 text-sm leading-6 text-muted-foreground">L’espace de publication n’accepte pas d’inscription publique. Un administrateur du cabinet doit vous envoyer une invitation par e-mail ; le lien reçu vous permettra de choisir votre mot de passe.</p>
    <div className="mt-5 rounded-xl border border-[#b94f5b]/40 bg-[#f7e9ec] p-4 text-sm leading-6 text-[#073e53]" data-testid="notice-migration">
      <b>Anciens comptes :</b> les mots de passe de l’ancien système de connexion n’ont pas été transférés. Si votre adresse a déjà été invitée, utilisez « Mot de passe oublié » pour en définir un nouveau.
    </div>
    <div className="mt-6 flex flex-wrap gap-2">
      <Link href="/sign-in" className="btn-navy" data-testid="link-signup-signin">Se connecter</Link>
      <Link href="/forgot-password" className="btn-gold" data-testid="link-signup-recover">Définir un mot de passe</Link>
    </div>
  </Frame>;
}

function Reset() {
  const [, setLocation] = useLocation();
  const { session, loading } = useCabinetSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(null);
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setError(translate(error.message)); return; }
      setLocation('/admin');
    } catch (err) { setError(translate(err instanceof Error ? err.message : '')); }
    finally { setBusy(false); }
  }
  if (loading) return <Frame eyebrow="Nouveau mot de passe" title="Vérification du lien">
    <div className="mt-6 space-y-3" aria-busy="true" data-testid="status-reset-loading"><div className="h-10 animate-pulse rounded-xl bg-secondary" /><div className="h-10 animate-pulse rounded-xl bg-secondary" /></div>
  </Frame>;
  if (!session) return <Frame eyebrow="Nouveau mot de passe" title="Lien invalide ou expiré">
    <p role="alert" className="mt-3 text-sm leading-6 text-muted-foreground" data-testid="text-reset-invalid">Ce lien ne permet pas d’ouvrir une session. Il a peut-être déjà été utilisé ou a expiré. Demandez un nouveau lien.</p>
    <Link href="/forgot-password" className="btn-navy mt-6" data-testid="link-reset-recover">Recevoir un nouveau lien</Link>
  </Frame>;
  return <Frame eyebrow="Nouveau mot de passe" title="Choisissez votre mot de passe">
    <p className="mt-3 text-sm text-muted-foreground">Compte : <b data-testid="text-reset-email">{session.user.email}</b></p>
    <form onSubmit={(e) => void submit(e)}>
      <Field id="new-password" label="Nouveau mot de passe (8 caractères minimum)" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      <Field id="confirm-password" label="Confirmer le mot de passe" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <Alert error={error} />
      <button type="submit" disabled={busy} className="btn-navy mt-6 w-full justify-center disabled:opacity-60" data-testid="button-reset">{busy ? 'Enregistrement…' : 'Enregistrer et continuer'}</button>
    </form>
  </Frame>;
}

export function AuthPage({ mode }: { mode: Mode }) {
  if (mode === 'signin') return <SignIn />;
  if (mode === 'recover') return <Recover />;
  if (mode === 'signup') return <SignUpInfo />;
  return <Reset />;
}
