import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

const siteIntro = document.getElementById('site-intro');
if (siteIntro && !document.documentElement.classList.contains('site-intro-seen') && !document.documentElement.classList.contains('site-intro-skip')) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.setTimeout(() => {
    siteIntro.classList.add('site-intro--leaving');
    window.setTimeout(() => siteIntro.remove(), reducedMotion ? 0 : 420);
  }, reducedMotion ? 500 : 1_750);
}
