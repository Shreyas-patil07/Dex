import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { DexBackground } from './components/DexBackground';
import { getCachedAuthState } from './lib/authSession';

const AboutPage = lazy(() => import('./pages/AboutPage').then(module => ({ default: module.AboutPage })));
const MediaDetailsPage = lazy(() => import('./pages/MediaDetailsPage').then(module => ({ default: module.MediaDetailsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const SignUpPage = lazy(() => import('./pages/SignUpPage').then(module => ({ default: module.SignUpPage })));
const TermsOfService = lazy(() => import('./pages/TermsOfService').then(module => ({ default: module.TermsOfService })));
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(module => ({ default: module.SearchPage })));


const normalizePath = (value: string) => value.replace(/\/$/, '') || '/';
const routes = new Set(['/','/about-me','/privacy-policy','/terms-of-service','/sign-up','/profile','/search']);
const mediaRoute = /^\/(movie|tv)\/\d+$/;

export const App: React.FC = () => {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));
  const [transitioning, setTransitioning] = useState(false);

  const navigate = useCallback((to: string, replace = false) => {
    const nextPath = normalizePath(to);
    if ((!routes.has(nextPath) && !mediaRoute.test(nextPath)) || nextPath === path) return;
    if (replace) window.history.replaceState({}, '', nextPath);
    else window.history.pushState({}, '', nextPath);
    setTransitioning(true);
    setPath(nextPath);
    window.scrollTo(0, 0);
    window.setTimeout(() => setTransitioning(false), 220);
  }, [path]);

  useEffect(() => {
    const onPopState = () => {
      setTransitioning(true);
      setPath(normalizePath(window.location.pathname));
      window.scrollTo(0, 0);
      window.setTimeout(() => setTransitioning(false), 220);
    };
    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      const nextPath = normalizePath(url.pathname);
      if (url.origin !== window.location.origin || (!routes.has(nextPath) && !mediaRoute.test(nextPath))) return;
      event.preventDefault();
      navigate(nextPath);
    };
    window.addEventListener('popstate', onPopState);
    document.addEventListener('click', onDocumentClick);
    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onDocumentClick);
    };
  }, [navigate]);

  useEffect(() => {
    if (path === '/sign-up' && getCachedAuthState() === 'signed_in') {
      window.history.replaceState({}, '', '/profile');
      setPath('/profile');
    }
  }, [path]);

  const page = useMemo(() => {
    if (path === '/privacy-policy') return <PrivacyPolicy />;
    if (path === '/terms-of-service') return <TermsOfService />;
    if (path === '/about-me') return <AboutPage />;
    if (path === '/sign-up') return <SignUpPage />;
    if (path === '/profile') return <ProfilePage />;
    if (path === '/search') return <SearchPage />;
    if (mediaRoute.test(path)) return <MediaDetailsPage />;
    return <HomePage />;
  }, [path]);

  return (
    <div className="dex-shell relative min-h-screen overflow-x-hidden bg-[#080810]">
      <DexBackground />
      {transitioning && <div className="dex-route-progress" aria-hidden="true" />}
      <Suspense fallback={<div className="relative z-10 flex min-h-[50vh] items-center justify-center text-sm text-[#94A3B8]">Loading Dex…</div>}>
        <div key={path} className="dex-route relative z-10 min-h-screen dex-page-enter">{page}</div>
      </Suspense>
    </div>
  );
};

export default App;
