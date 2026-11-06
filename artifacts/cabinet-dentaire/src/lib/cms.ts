import { useMutation, useQuery } from '@tanstack/react-query';
import type { ContentDocument, ContentPublication, SiteContent } from '@workspace/api-client-react';
import { cmsRequest } from './supabase';
import { useCabinetSession } from '@/components/auth-provider';

export const publicContentKey = ['cabinet', 'public-content'] as const;
export const adminContentKey = ['cabinet', 'admin-content'] as const;
export const adminAccessKey = ['cabinet', 'admin-access'] as const;
function readPrerenderedContent(): SiteContent | undefined {
  const snapshot = document.getElementById('cabinet-public-content')?.textContent;
  if (!snapshot) return undefined;
  try {
    const content = JSON.parse(snapshot) as SiteContent;
    if (!content.clinic || !content.hero || !Array.isArray(content.services) || !Array.isArray(content.blogPosts)) throw new Error('Invalid public snapshot');
    return content;
  } catch {
    console.warn('Public page snapshot unavailable; requesting the current content.');
    return undefined;
  }
}
const prerenderedContent = readPrerenderedContent();
export function usePublicContent() {
  return useQuery({
    queryKey: publicContentKey,
    queryFn: () => cmsRequest<SiteContent>('/site-content', {}, false),
    initialData: prerenderedContent,
    // Show the public build snapshot immediately, but always refresh it.
    initialDataUpdatedAt: 0,
    staleTime: 5_000,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });
}
export function useAdminAccess() {
  const { session, loading } = useCabinetSession();
  const query = useQuery({
    queryKey: [...adminAccessKey, session?.user.id ?? 'anonymous'],
    queryFn: () => cmsRequest<{ isAdmin: boolean }>('/admin/access'),
    enabled: !loading && !!session, retry: false, staleTime: 0,
  });
  return { ...query, isLoading: loading || (!!session && query.isLoading) };
}
export function useAdminContent(enabled: boolean) {
  const { session } = useCabinetSession();
  return useQuery({ queryKey: [...adminContentKey, session?.user.id], queryFn: () => cmsRequest<ContentDocument>('/admin/site-content'), enabled, retry: false });
}
export function usePublishContent() {
  return useMutation({ mutationFn: (publication: ContentPublication) => {
    const content = {
      ...publication.content,
      campaigns: publication.content.campaigns.map((campaign) => ({
        ...campaign,
        publishedAt: campaign.publishedAt?.trim() || undefined,
      })),
    };
    return cmsRequest<ContentDocument>('/admin/site-content', { method: 'PUT', body: JSON.stringify({ ...publication, content }) });
  } });
}

export function collectMediaUrls(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectMediaUrls);
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectMediaUrls);
  return [];
}
