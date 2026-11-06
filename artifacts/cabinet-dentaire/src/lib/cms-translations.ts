import type { BlogPost, ServiceItem, SiteContent } from '@workspace/api-client-react';
import fallbackContent from './cms-translations.json';

type ServiceFallback = (typeof fallbackContent.services)[keyof typeof fallbackContent.services];
type BlogFallback = (typeof fallbackContent.blogPosts)[keyof typeof fallbackContent.blogPosts];

function serviceFallback(item: ServiceItem): ServiceFallback | undefined {
  return fallbackContent.services[item.slug as keyof typeof fallbackContent.services]
    || fallbackContent.services[item.id as keyof typeof fallbackContent.services];
}

function blogFallback(post: BlogPost): BlogFallback | undefined {
  return fallbackContent.blogPosts[post.slug as keyof typeof fallbackContent.blogPosts]
    || fallbackContent.blogPosts[post.id as keyof typeof fallbackContent.blogPosts];
}

export function englishService(item: ServiceItem) {
  const fallback = serviceFallback(item);
  return {
    title: item.titleEn?.trim() || fallback?.title || 'English translation not yet available.',
    slug: item.slugEn?.trim() || fallback?.slugEn || item.slug,
    summary: item.summaryEn?.trim() || fallback?.summary || 'English translation not yet available.',
    description: item.descriptionEn?.trim() || fallback?.description || 'English translation not yet available.',
    purpose: item.purposeEn?.trim() || fallback?.purpose || '',
    procedureSteps: item.procedureStepsEn?.trim() || fallback?.procedureSteps || '',
    imageAlt: item.imageAltEn?.trim() || fallback?.imageAlt || 'Dental care illustration.',
  };
}

export function englishBlogPost(post: BlogPost) {
  const fallback = blogFallback(post);
  return {
    title: post.titleEn?.trim() || fallback?.title || 'English translation not yet available.',
    slug: post.slugEn?.trim() || fallback?.slugEn || post.slug,
    excerpt: post.excerptEn?.trim() || fallback?.excerpt || 'English translation not yet available.',
    content: post.contentEn?.trim() || fallback?.content || '',
    author: post.authorEn?.trim() || fallback?.author || 'Practice team',
    imageAlt: post.imageAltEn?.trim() || fallback?.imageAlt || 'Dental health article illustration.',
  };
}

export function englishFaq(faq: SiteContent['faqs'][number]) {
  const fallback = fallbackContent.faqs[faq.question as keyof typeof fallbackContent.faqs];
  return {
    question: faq.questionEn?.trim() || fallback?.question || 'English translation not yet available.',
    answer: faq.answerEn?.trim() || fallback?.answer || 'Please contact the practice for this information in English.',
  };
}

export function fillEnglishFieldsForAdmin(item: ServiceItem) {
  const translated = serviceFallback(item);
  return {
    ...item,
    titleEn: item.titleEn?.trim() || translated?.title || '',
    slugEn: item.slugEn?.trim() || translated?.slugEn || '',
    summaryEn: item.summaryEn?.trim() || translated?.summary || '',
    descriptionEn: item.descriptionEn?.trim() || translated?.description || '',
    purposeEn: item.purposeEn?.trim() || translated?.purpose || '',
    procedureStepsEn: item.procedureStepsEn?.trim() || translated?.procedureSteps || '',
    imageAltEn: item.imageAltEn?.trim() || translated?.imageAlt || '',
  };
}

export function fillEnglishFieldsForBlogAdmin(item: BlogPost) {
  const translated = blogFallback(item);
  return {
    ...item,
    titleEn: item.titleEn?.trim() || translated?.title || '',
    slugEn: item.slugEn?.trim() || translated?.slugEn || '',
    excerptEn: item.excerptEn?.trim() || translated?.excerpt || '',
    contentEn: item.contentEn?.trim() || translated?.content || '',
    authorEn: item.authorEn?.trim() || translated?.author || '',
    imageAltEn: item.imageAltEn?.trim() || translated?.imageAlt || '',
  };
}

export function fillEnglishFieldsForFaqAdmin(item: SiteContent['faqs'][number]) {
  const fallback = fallbackContent.faqs[item.question as keyof typeof fallbackContent.faqs];
  return {
    ...item,
    questionEn: item.questionEn?.trim() || fallback?.question || '',
    answerEn: item.answerEn?.trim() || fallback?.answer || '',
  };
}
