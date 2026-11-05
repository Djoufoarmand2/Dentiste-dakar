import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { FolderOpen, Trash2, Upload, X } from 'lucide-react';
import { deleteMedia, imageAccept, listMedia, uploadMedia, videoAccept, type MediaAsset } from '@/lib/media';
import { VideoPlayer } from './video-player';

type Props = { value: string; onChange: (url: string) => void; kind: 'image' | 'video'; protectedUrls: string[]; disabled?: boolean };

const errText = (e: unknown) => (e instanceof Error && e.message ? e.message : 'Une erreur est survenue.');
const size = (n: number) => `${(n / 1024 / 1024).toFixed(1)} Mo`;

export function MediaField({ value, onChange, kind, protectedUrls, disabled = false }: Props) {
  const id = useId();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [loadingLib, setLoadingLib] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { if (!value) setSuccess(null); }, [value]);

  const refresh = useCallback(async () => {
    setLoadingLib(true);
    try { setAssets(await listMedia()); } catch (e) { setError(errText(e)); }
    finally { setLoadingLib(false); }
  }, []);

  useEffect(() => { if (open) void refresh(); }, [open, refresh]);

  const uploading = progress !== null;
  const accept = kind === 'image' ? imageAccept : videoAccept;

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null); setSuccess(null);
    if (!accept.split(',').includes(file.type)) { setError(kind === 'image' ? 'Format accepté : JPEG, PNG, WebP ou GIF.' : 'Format accepté : MP4 ou WebM.'); return; }
    const limit = kind === 'image' ? 10 : 50;
    if (file.size > limit * 1024 * 1024) { setError(`Le fichier dépasse la limite de ${limit} Mo.`); return; }
    const ctrl = new AbortController();
    controller.current = ctrl;
    setProgress(0);
    try {
      const asset = await uploadMedia(file, (p) => { if (!ctrl.signal.aborted) setProgress(p); }, ctrl.signal);
      if (ctrl.signal.aborted) return;
      onChangeRef.current(asset.url);
      setSuccess('Fichier téléversé. Publiez pour l’afficher sur le site.');
      if (open) void refresh();
    } catch (err) {
      if (!ctrl.signal.aborted) setError(errText(err));
    } finally {
      if (!ctrl.signal.aborted) setProgress(null);
      if (controller.current === ctrl) controller.current = null;
    }
  }

  async function remove(asset: MediaAsset) {
    if (protectedUrls.includes(asset.url) || asset.url === value) return;
    if (!window.confirm(`Supprimer définitivement « ${asset.name} » de la médiathèque ?`)) return;
    setDeleting(asset.path); setError(null); setSuccess(null);
    try { await deleteMedia(asset.path); setSuccess('Fichier supprimé.'); await refresh(); }
    catch (e) { setError(errText(e)); }
    finally { setDeleting(null); }
  }

  const isKind = (a: MediaAsset) => a.mimeType.startsWith(`${kind}/`);
  const visible = (assets ?? []).filter(isKind);

  return <div className="space-y-3 md:col-span-2" data-testid={`media-field-${kind}`}>
    <label htmlFor={`${id}-url`} className="block text-xs font-medium text-foreground/80">{kind === 'image' ? 'Image (URL ou téléversement)' : 'Vidéo (YouTube, URL ou téléversement)'}</label>
    <input id={`${id}-url`} type="url" className="editor-input" placeholder={kind === 'video' ? 'https://youtube.com/watch?v=… ou https://youtu.be/…' : 'https://…'} value={value} disabled={disabled || uploading} onChange={(e) => onChange(e.target.value)} data-testid={`input-media-url-${kind}`} />
    {kind === 'video' && <p className="text-xs leading-5 text-muted-foreground">Collez un lien YouTube pour afficher son aperçu, ou téléversez une vidéo MP4/WebM.</p>}
    <div className="flex flex-wrap gap-2">
      <input ref={fileRef} id={`${id}-file`} type="file" accept={accept} className="sr-only" onChange={(e) => void onFile(e)} disabled={disabled || uploading} aria-label={kind === 'image' ? 'Choisir une image (10 Mo max.)' : 'Choisir une vidéo (50 Mo max.)'} data-testid={`input-media-file-${kind}`} />
      <button type="button" className="btn-navy disabled:opacity-60" disabled={disabled || uploading} onClick={() => fileRef.current?.click()} data-testid={`button-upload-${kind}`}><Upload size={15} /> {uploading ? 'Téléversement…' : `Téléverser (${kind === 'image' ? '10' : '50'} Mo max.)`}</button>
      <button type="button" className="btn-gold disabled:opacity-60" disabled={disabled} aria-expanded={open} aria-controls={`${id}-lib`} onClick={() => setOpen((o) => !o)} data-testid={`button-library-${kind}`}><FolderOpen size={15} /> {open ? 'Fermer la médiathèque' : 'Médiathèque'}</button>
      {value && <button type="button" className="inline-flex items-center gap-1 rounded px-3 text-xs text-muted-foreground hover:text-destructive disabled:opacity-60" disabled={disabled || uploading} onClick={() => { onChange(''); setSuccess('Référence retirée.'); }} data-testid={`button-clear-${kind}`}><X size={14} /> Retirer</button>}
    </div>
    {uploading && <div>
      <div role="progressbar" aria-label="Progression du téléversement" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full origin-left bg-[#073e53] transition-transform" style={{ transform: `scaleX(${progress / 100})` }} /></div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span data-testid="text-upload-progress">{progress} %</span><button type="button" className="hover:text-destructive" onClick={() => { controller.current?.abort(); setProgress(null); setError('Téléversement annulé.'); }} data-testid="button-cancel-upload">Annuler</button></div>
    </div>}
    {error && <p role="alert" className="rounded-xl border border-[#e7c8c1] bg-[#f8e9e5] p-3 text-xs text-[#943d35]" data-testid="text-media-error">{error}</p>}
    {success && <p role="status" className="rounded-xl border border-[#b94f5b]/30 bg-[#f7e9ec] p-3 text-xs text-[#073e53]" data-testid="text-media-success">{success}</p>}
    {value && <div className="overflow-hidden rounded-xl border border-border bg-secondary/40" data-testid={`preview-media-${kind}`}>
      {kind === 'image' ? <img src={value} alt="Aperçu du visuel sélectionné" className="h-48 w-full object-cover" /> : <VideoPlayer src={value} title="Aperçu de la vidéo sélectionnée" />}
    </div>}
    {open && <div id={`${id}-lib`} className="rounded-xl border border-border bg-card p-3" data-testid={`library-${kind}`}>
      <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">Médiathèque · {kind === 'image' ? 'images' : 'vidéos'}</p><button type="button" className="text-xs text-primary hover:underline disabled:opacity-60" disabled={loadingLib} onClick={() => void refresh()} data-testid="button-refresh-library">Actualiser</button></div>
      {loadingLib && !assets ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-secondary" />)}</div>
        : !visible.length ? <p className="py-6 text-center text-xs text-muted-foreground" data-testid="text-library-empty">Aucun fichier pour le moment. Téléversez un premier {kind === 'image' ? 'visuel' : 'clip'}.</p>
        : <ul className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">{visible.map((a) => {
          const ready = a.status === 'ready';
          const locked = protectedUrls.includes(a.url) || a.url === value;
          return <li key={a.path} className={`overflow-hidden rounded-lg border ${a.url === value ? 'border-[#073e53] ring-2 ring-[#073e53]/30' : 'border-border'}`} data-testid={`asset-${a.path}`}>
            <button type="button" disabled={!ready || disabled || uploading} onClick={() => { onChange(a.url); setSuccess('Fichier sélectionné.'); }} className="block w-full text-left disabled:cursor-not-allowed disabled:opacity-60" aria-label={`Sélectionner ${a.name}`} data-testid={`button-select-asset-${a.path}`}>
              {kind === 'image' && ready ? <img src={a.url} alt="" className="h-20 w-full object-cover" loading="lazy" /> : <div className="grid h-20 place-items-center bg-secondary text-[10px] uppercase tracking-wide text-muted-foreground">{ready ? 'Vidéo' : a.status === 'uploading' ? 'Incomplet' : 'Suppression'}</div>}
              <span className="block truncate px-2 pt-1 text-[11px]">{a.name}</span>
              <span className="block px-2 text-[10px] text-muted-foreground">{size(a.size)}{locked ? ' · utilisé' : ''}</span>
            </button>
            <div className="flex justify-end px-1 pb-1"><button type="button" disabled={locked || deleting === a.path || disabled} onClick={() => void remove(a)} title={locked ? 'Utilisé dans le contenu : impossible de supprimer' : 'Supprimer'} aria-label={`Supprimer ${a.name}`} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30" data-testid={`button-delete-asset-${a.path}`}><Trash2 size={13} /></button></div>
          </li>;
        })}</ul>}
    </div>}
  </div>;
}
