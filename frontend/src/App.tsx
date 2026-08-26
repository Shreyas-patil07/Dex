import React from 'react';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { ProfilePage } from './pages/ProfilePage';
import { TermsOfService } from './pages/TermsOfService';
import { TrendingPage } from './pages/TrendingPage';

export const App: React.FC = () => {
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  if (path === '/privacy-policy') return <PrivacyPolicy />;
  if (path === '/terms-of-service') return <TermsOfService />;
  if (path === '/about-me') return <LandingPage />;
  if (path === '/sign-up') return <AuthPage />;
  if (path === '/profile') return <ProfilePage />;

  return <TrendingPage />;
};

export default App;
