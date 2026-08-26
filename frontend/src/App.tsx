import React from 'react';
import { DexBackground } from './components/DexBackground';
import { AboutPage } from './pages/AboutPage';
import { ProfilePage } from './pages/ProfilePage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { SignUpPage } from './pages/SignUpPage';
import { TermsOfService } from './pages/TermsOfService';
import { HomePage } from './pages/HomePage';

export const App: React.FC = () => {
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  const page = path === '/privacy-policy' ? <PrivacyPolicy />
    : path === '/terms-of-service' ? <TermsOfService />
    : path === '/about-me' ? <AboutPage />
    : path === '/sign-up' ? <SignUpPage />
    : path === '/profile' ? <ProfilePage />
    : <HomePage />;

  return (
    <div className="dex-shell relative min-h-screen overflow-x-hidden bg-[#080810]">
      {path !== '/about-me' && <DexBackground />}
      <div className="dex-route relative z-10 min-h-screen">{page}</div>
    </div>
  );
};

export default App;
