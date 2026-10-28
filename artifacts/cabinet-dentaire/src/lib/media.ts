import { Upload } from 'tus-js-client';
import type { MediaAsset, MediaLibrary } from '@workspace/api-client-react';
import { cmsRequest, mediaBucket, supabase, supabasePublicKey, supabaseUrl } from './supabase';

export type { MediaAsset };
export const IMAGE_LIMIT = 10 * 1024 * 1024;
export const VIDEO_LIMIT = 50 * 1024 * 1024;
export const imageAccept = 'image/jpeg,image/png,image/webp,image/gif';
export const videoAccept = 'video/mp4,video/webm';
export const listMedia = () => cmsRequest<MediaLibrary>('/admin/media').then((result) => result.items);
export const deleteMedia = (path: string) => cmsRequest<void>('/admin/media/delete', { method: 'POST', body: JSON.stringify({ path }) });

function matchesSignature(b: Uint8Array, type: string) {
  const ascii = (start: number, length: number) => String.fromCharCode(...b.slice(start, start + length));
  if (type === 'image/jpeg') return b[0] === 255 && b[1] === 216 && b[2] === 255;
  if (type === 'image/png') return [...b.slice(0, 8)].join(',') === '137,80,78,71,13,10,26,10';
  if (type === 'image/gif') return ['GIF87a', 'GIF89a'].includes(ascii(0, 6));
  if (type === 'image/webp') return ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP';
  if (type === 'video/mp4') return ascii(4, 4) === 'ftyp';
  if (type === 'video/webm') return [...b.slice(0, 4)].join(',') === '26,69,223,163';
  return false;
}

export async function uploadMedia(file: File, onProgress: (percent: number) => void, signal?: AbortSignal): Promise<MediaAsset> {
  const isVideo = videoAccept.split(',').includes(file.type);
  if (!isVideo && !imageAccept.split(',').includes(file.type)) throw new Error('Format non accepté. Utilisez JPEG, PNG, WebP, GIF, MP4 ou WebM.');
  if (!file.size || file.size > (isVideo ? VIDEO_LIMIT : IMAGE_LIMIT)) throw new Error(`Le fichier dépasse la limite de ${isVideo ? '50' : '10'} Mo ou est vide.`);
  if (!matchesSignature(new Uint8Array(await file.slice(0, 32).arrayBuffer()), file.type)) throw new Error('Le contenu du fichier ne correspond pas à son format.');
  if (signal?.aborted) throw new Error('Téléversement annulé.');
  const asset = await cmsRequest<MediaAsset>('/admin/media/prepare', { method: 'POST', body: JSON.stringify({ name: file.name, size: file.size, mimeType: file.type }) });
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error('Votre session a expiré. Reconnectez-vous.');
    await new Promise<void>((resolve, reject) => {
      const abort = () => { void upload.abort(); reject(new Error('Téléversement annulé.')); };
      const cleanup = () => signal?.removeEventListener('abort', abort);
      const upload = new Upload(file, {
        endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
        headers: { authorization: `Bearer ${data.session!.access_token}`, apikey: supabasePublicKey },
        metadata: { bucketName: mediaBucket, objectName: asset.path, contentType: file.type, cacheControl: '3600' },
        chunkSize: 6 * 1024 * 1024,
        retryDelays: [0, 1000, 3000, 5000],
        uploadDataDuringCreation: true, removeFingerprintOnSuccess: true,
        onProgress: (done, total) => onProgress(Math.round((done / total) * 100)),
        onError: () => { cleanup(); reject(new Error('Le transfert a échoué. Vérifiez votre connexion et réessayez.')); },
        onSuccess: () => { cleanup(); resolve(); },
      });
      if (signal?.aborted) { abort(); return; }
      signal?.addEventListener('abort', abort, { once: true });
      upload.start();
    });
    return await cmsRequest<MediaAsset>('/admin/media/finalize', { method: 'POST', body: JSON.stringify({ path: asset.path }) });
  } catch (error) {
    await deleteMedia(asset.path).catch(() => undefined);
    throw error;
  }
}
