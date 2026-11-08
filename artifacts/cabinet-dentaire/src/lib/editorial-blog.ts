import type { BlogPost, SiteContent } from '@workspace/api-client-react';
import sourcePosts from './editorial-blog.json';

const baseUrl = import.meta.env.BASE_URL;

export const editorialBlogPosts = sourcePosts as BlogPost[];

export function withEditorialBlogPosts(content: SiteContent): SiteContent {
  if (content.editorialBlogLibraryManaged) return content;
  const existingSlugs = new Set(content.blogPosts.map((post) => post.slug));
  const additions = editorialBlogPosts
    .filter((post) => !existingSlugs.has(post.slug))
    .map((post) => ({
      ...post,
      imageUrl: `${baseUrl}${post.imageUrl.replace(/^\/+/, '')}`,
    }));
  return additions.length
    ? { ...content, blogPosts: [...content.blogPosts, ...additions] }
    : content;
}
