import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { resolvePageMeta } from './resolveSeoRouteMeta';

const getSeoBaseUrl = () => {
  const configuredSiteUrl = String(
    import.meta.env.VITE_PUBLIC_SITE_URL || import.meta.env.VITE_SITE_URL || '',
  ).trim();

  if (configuredSiteUrl) {
    return configuredSiteUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return '';
};

const SEO_BASE_URL = getSeoBaseUrl();
const SEO_DEFAULT_IMAGE_PATH = '/images/homepage-hero-boy-platform.webp';

const upsertMeta = (selector: string, attribute: 'name' | 'property', name: string, content: string) => {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

export const SeoRouteMeta: React.FC = () => {
  const location = useLocation();
  const user = useStore((state) => state.user);
  const [urlTick, setUrlTick] = useState(0);

  useEffect(() => {
    const handleUrlChange = () => setUrlTick((prev) => prev + 1);
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('app:url-change', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('app:url-change', handleUrlChange);
    };
  }, []);

  useEffect(() => {
    const rawPath = (typeof window !== 'undefined' ? window.location.pathname : '') || location.pathname || '/';
    const rawSearch = (typeof window !== 'undefined' ? window.location.search : '') || location.search || '';
    const rawHash = (typeof window !== 'undefined' ? window.location.hash : '') || '';

    const meta = resolvePageMeta(rawPath, rawSearch, rawHash, user?.role);
    const canonicalPath = meta.isPrivate ? '/' : meta.canonicalPath;
    const canonicalUrl = `${SEO_BASE_URL}${canonicalPath === '/' ? '/' : canonicalPath}`;
    const imageUrl = `${SEO_BASE_URL}${SEO_DEFAULT_IMAGE_PATH}`;
    const robots = meta.isPrivate ? 'noindex, nofollow' : 'index, follow';

    document.title = meta.title;
    upsertMeta('meta[name="description"]', 'name', 'description', meta.description);
    upsertMeta('meta[name="robots"]', 'name', 'robots', robots);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', meta.title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', meta.description);
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', imageUrl);
    upsertMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', 'منصة المئة للقدرات والتحصيلي');
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', meta.description);
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [location.pathname, location.search, urlTick, user?.role]);

  return null;
};

