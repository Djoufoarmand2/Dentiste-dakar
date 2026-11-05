const youtubeHosts = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

const youtubeNoCookieHosts = new Set([
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;

export function getYouTubeEmbedUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);
  let videoId = '';

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    videoId = segments[0] ?? '';
  } else if (youtubeHosts.has(host)) {
    if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v') ?? '';
    } else if (['embed', 'shorts', 'live'].includes(segments[0] ?? '')) {
      videoId = segments[1] ?? '';
    }
  } else if (youtubeNoCookieHosts.has(host) && segments[0] === 'embed') {
    videoId = segments[1] ?? '';
  } else {
    return null;
  }

  if (!videoIdPattern.test(videoId)) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`;
}
