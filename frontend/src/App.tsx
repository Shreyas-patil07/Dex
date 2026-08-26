import React from 'react';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';

export const App: React.FC = () => {
  const path = window.location.pathname.replace(/\/$/, '') || '/';

  if (path === '/privacy-policy') return <PrivacyPolicy />;
  if (path === '/terms-of-service') return <TermsOfService />;

  return <LandingPage />;
};

export default App;
