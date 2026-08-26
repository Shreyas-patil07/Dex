import React from 'react';
import { AboutPage } from './pages/AboutPage';
import { ProfilePage } from './pages/ProfilePage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { SignUpPage } from './pages/SignUpPage';
import { TermsOfService } from './pages/TermsOfService';
import { HomePage } from './pages/HomePage';

export const App: React.FC = () => {
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  if (path === '/privacy-policy') return <PrivacyPolicy />;
  if (path === '/terms-of-service') return <TermsOfService />;
  if (path === '/about-me') return <AboutPage />;
  if (path === '/sign-up') return <SignUpPage />;
  if (path === '/profile') return <ProfilePage />;

  return <HomePage />;
};

export default App;
