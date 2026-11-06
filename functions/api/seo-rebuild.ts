interface SeoRebuildEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  CLOUDFLARE_PAGES_DEPLOY_HOOK_URL?: string;
}

interface PagesFunctionContext {
  request: Request;
  env: SeoRebuildEnv;
}

function respond(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function isCloudflarePagesHook(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'api.cloudflare.com'
      && !url.search
      && !url.hash
      && /^\/client\/v4\/pages\/webhooks\/deploy_hooks\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

export async function onRequestPost({ request, env }: PagesFunctionContext): Promise<Response> {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== requestUrl.origin) return respond({ ok: false, error: 'Origin not allowed.' }, 403);

  const authorization = request.headers.get('Authorization') || '';
  if (!/^Bearer\s+\S+$/i.test(authorization)) return respond({ ok: false, error: 'Admin authentication required.' }, 401);

  const supabaseUrl = env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const deployHookUrl = env.CLOUDFLARE_PAGES_DEPLOY_HOOK_URL;
  if (!supabaseUrl || !publishableKey || !deployHookUrl) {
    return respond({ ok: false, error: 'Automatic Cloudflare rebuild is not configured.' }, 503);
  }
  if (!isCloudflarePagesHook(deployHookUrl)) {
    return respond({ ok: false, error: 'Cloudflare build hook configuration is invalid.' }, 503);
  }

  try {
    const accessResponse = await fetch(`${supabaseUrl}/functions/v1/cabinet-api/admin/access`, {
      headers: {
        apikey: publishableKey,
        Authorization: authorization,
      },
    });
    if (accessResponse.status === 401 || accessResponse.status === 403) {
      return respond({ ok: false, error: 'Admin access could not be verified.' }, 403);
    }
    if (!accessResponse.ok) return respond({ ok: false, error: 'Admin access verification is unavailable.' }, 503);

    const access = await accessResponse.json().catch(() => null) as { isAdmin?: boolean } | null;
    if (access?.isAdmin !== true) return respond({ ok: false, error: 'Admin access required.' }, 403);

    const buildResponse = await fetch(deployHookUrl, { method: 'POST', redirect: 'manual' });
    if (!buildResponse.ok) return respond({ ok: false, error: 'Cloudflare did not accept the rebuild request.' }, 502);

    const build = await buildResponse.json().catch(() => null) as { result?: { build_uuid?: string } } | null;
    return respond({ ok: true, buildId: build?.result?.build_uuid });
  } catch {
    return respond({ ok: false, error: 'Automatic Cloudflare rebuild could not be reached.' }, 502);
  }
}
