import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DexBackground } from './components/DexBackground';
import { getCachedAuthState } from './lib/authSession';
import { AboutPage } from './pages/AboutPage';
import { ProfilePage } from './pages/ProfilePage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { SignUpPage } from './pages/SignUpPage';
import { TermsOfService } from './pages/TermsOfService';
import { HomePage } from './pages/HomePage';

const normalizePath = (value: string) => value.replace(/\/$/, '') || '/';
const routes = new Set(['/','/about-me','/privacy-policy','/terms-of-service','/sign-up','/profile']);

export const App: React.FC = () => {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));
  const [transitioning, setTransitioning] = useState(false);

  const navigate = useCallback((to: string, replace = false) => {
    const nextPath = normalizePath(to);
    if (!routes.has(nextPath) || nextPath === path) return;

    if (replace) {
      window.history.replaceState({}, '', nextPath);
    } else {
      window.history.pushState({}, '', nextPath);
    }

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
      if (url.origin !== window.location.origin || !routes.has(nextPath)) return;

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

  const page = useMemo(() => path === '/privacy-policy' ? <PrivacyPolicy />
    : path === '/terms-of-service' ? <TermsOfService />
    : path === '/about-me' ? <AboutPage />
    : path === '/sign-up' ? <SignUpPage />
    : path === '/profile' ? <ProfilePage />
    : <HomePage />, [path]);

  return (
    <div className="dex-shell relative min-h-screen overflow-x-hidden bg-[#080810]">
      <DexBackground />
      {transitioning && <div className="dex-route-progress" aria-hidden="true" />}
      <div key={path} className="dex-route relative z-10 min-h-screen dex-page-enter">{page}</div>
    </div>
  );
};

export default App;
