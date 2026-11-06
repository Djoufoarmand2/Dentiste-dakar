import { useState } from 'react';
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl } from '@/lib/video-url';
import { useSiteLocale } from '@/lib/site-locale';

type Props = {
  src: string;
  title: string;
  poster?: string;
  className?: string;
  testId?: string;
};

export function VideoPlayer({ src, title, poster, className, testId }: Props) {
  const embedUrl = getYouTubeEmbedUrl(src);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const english = useSiteLocale() === 'en';
  const thumbnail = poster || getYouTubeThumbnailUrl(src);

  return <div
    className={`relative w-full overflow-hidden bg-[#070116] ${className ?? 'aspect-video'}`}
    data-testid={testId}
  >
    {embedUrl && loadedSource !== src
      ? <button
        type="button"
        onClick={() => setLoadedSource(src)}
        aria-label={`${english ? 'Load YouTube video' : 'Charger la vidéo YouTube'} : ${title}`}
        className="group relative flex h-full min-h-48 w-full items-center justify-center text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
      >
        {thumbnail && <img src={thumbnail} alt="" width="480" height="360" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />}
        <span aria-hidden="true" className="absolute inset-0 bg-black/35 transition-colors group-hover:bg-black/20" />
        <span aria-hidden="true" className="relative grid h-16 w-20 place-items-center rounded-2xl bg-[#b91c1c] shadow-lg transition-transform group-hover:scale-105"><svg width="26" height="30" viewBox="0 0 26 30" fill="currentColor"><path d="M3 2v26l22-13z" /></svg></span>
        <span className="absolute inset-x-0 bottom-0 bg-black/80 px-3 py-2 text-center text-xs">{english ? 'YouTube loads only after you click. Third-party privacy rules apply.' : 'YouTube se charge après votre clic. Les règles du service tiers s’appliquent.'}</span>
      </button>
      : embedUrl ? <iframe
        src={embedUrl}
        title={title}
        className="block h-full w-full border-0"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      : <video
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        aria-label={title}
        className="block h-full w-full object-contain"
      />}
  </div>;
}
