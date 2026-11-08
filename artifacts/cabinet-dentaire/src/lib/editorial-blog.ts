import type { BlogPost, SiteContent } from '@workspace/api-client-react';
import sourcePosts from './editorial-blog.json';

const baseUrl = import.meta.env.BASE_URL;

export const editorialBlogPosts: BlogPost[] = (sourcePosts as BlogPost[]).map((post) => ({
  ...post,
  imageUrl: `${baseUrl}${post.imageUrl.replace(/^\/+/, '')}`,
}));

export function withEditorialBlogPosts(content: SiteContent): SiteContent {
  const existingSlugs = new Set(content.blogPosts.map((post) => post.slug));
  const additions = editorialBlogPosts.filter((post) => !existingSlugs.has(post.slug));
  return additions.length
    ? { ...content, blogPosts: [...content.blogPosts, ...additions] }
    : content;
}
