import { getYouTubeEmbedUrl } from '@/lib/video-url';

type Props = {
  src: string;
  title: string;
  poster?: string;
  className?: string;
  testId?: string;
};

export function VideoPlayer({ src, title, poster, className, testId }: Props) {
  const embedUrl = getYouTubeEmbedUrl(src);

  return <div
    className={`relative w-full overflow-hidden bg-[#070116] ${className ?? 'aspect-video'}`}
    data-testid={testId}
  >
    {embedUrl
      ? <iframe
        src={embedUrl}
        title={title}
        className="block h-full w-full border-0"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
