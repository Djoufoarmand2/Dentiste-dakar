import type { BlogPost, SiteContent } from '@workspace/api-client-react';
import { replaceLegacyPracticeEmail } from './contact-info';
import sourcePosts from './editorial-blog.json';
import sourceRelations from './editorial-blog-relations.json';

const baseUrl = import.meta.env.BASE_URL;

export const editorialBlogPosts = replaceLegacyPracticeEmail(sourcePosts) as BlogPost[];
export const editorialBlogRelations = sourceRelations as Record<string, Pick<BlogPost, 'relatedServiceSlugs' | 'relatedArticleSlugs'>>;

export function withEditorialBlogPosts(content: SiteContent): SiteContent {
  const existingPosts = content.blogPosts.map((post) => {
    const normalizedPost = replaceLegacyPracticeEmail(post) as BlogPost;
    const relations = editorialBlogRelations[post.slug];
    if (!relations) return normalizedPost;
    return {
      ...normalizedPost,
      relatedServiceSlugs: normalizedPost.relatedServiceSlugs ?? relations.relatedServiceSlugs,
      relatedArticleSlugs: normalizedPost.relatedArticleSlugs ?? relations.relatedArticleSlugs,
    };
  });
  if (content.editorialBlogLibraryManaged) {
    return existingPosts.some((post, index) => post !== content.blogPosts[index])
      ? { ...content, blogPosts: existingPosts }
      : content;
  }
  const existingSlugs = new Set(existingPosts.map((post) => post.slug));
  const additions = editorialBlogPosts
    .filter((post) => !existingSlugs.has(post.slug))
    .map((post) => ({
      ...post,
      imageUrl: `${baseUrl}${post.imageUrl.replace(/^\/+/, '')}`,
      relatedServiceSlugs: post.relatedServiceSlugs ?? editorialBlogRelations[post.slug]?.relatedServiceSlugs,
      relatedArticleSlugs: post.relatedArticleSlugs ?? editorialBlogRelations[post.slug]?.relatedArticleSlugs,
    }));
  return additions.length || existingPosts.some((post, index) => post !== content.blogPosts[index])
    ? { ...content, blogPosts: [...existingPosts, ...additions] }
    : content;
}
