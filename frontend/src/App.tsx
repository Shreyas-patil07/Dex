import React from 'react';
import { DexBackground } from './components/DexBackground';
import { getCachedAuthState } from './lib/authSession';
import { AboutPage } from './pages/AboutPage';
import { ProfilePage } from './pages/ProfilePage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { SignUpPage } from './pages/SignUpPage';
import { TermsOfService } from './pages/TermsOfService';
import { HomePage } from './pages/HomePage';

export const App: React.FC = () => {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const cachedAuthState = getCachedAuthState();

  if (path === '/sign-up' && cachedAuthState === 'signed_in') {
    window.location.replace('/profile');
    return null;
  }

  const page = path === '/privacy-policy' ? <PrivacyPolicy />
    : path === '/terms-of-service' ? <TermsOfService />
    : path === '/about-me' ? <AboutPage />
    : path === '/sign-up' ? <SignUpPage />
    : path === '/profile' ? <ProfilePage />
    : <HomePage />;

  return (
    <div className="dex-shell relative min-h-screen overflow-x-hidden bg-[#080810]">
      <DexBackground />
      <div className="dex-route relative z-10 min-h-screen">{page}</div>
    </div>
  );
};

export default App;
