import React from 'react';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
    <div className="space-y-3 text-sm leading-7 text-[#A7AFC2] sm:text-base">{children}</div>
  </section>
);

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#080810] text-[#F8FAFC]">
      <header className="border-b border-white/[0.06] px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/DEXi.png" alt="Dex" className="h-12 w-12 object-contain" />
            <span className="text-lg font-semibold">Dex</span>
          </a>
          <a href="/" className="text-sm text-[#A855F7] hover:text-[#C084FC]">Back to Dex</a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <div className="mb-12 max-w-3xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.14em] text-[#A855F7]">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-sm text-[#64748B]">Effective date: August 26, 2026</p>
          <p className="mt-6 text-base leading-7 text-[#A7AFC2]">
            This Privacy Policy explains how Dex may collect, use, disclose, retain, and protect information when you use Dex websites, applications, and related services (collectively, the “Service”).
          </p>
          <p className="mt-4 text-sm leading-6 text-[#64748B]">
            Replace the bracketed legal-contact details before public launch. This document is a product-ready starting point and should be reviewed for the jurisdictions in which Dex operates.
          </p>
        </div>

        <div className="space-y-10">
          <Section title="1. Who We Are">
            <p>Dex is an entertainment identity platform that helps users track what they watch, understand their entertainment taste, discover movies and series, and optionally share aspects of that identity with others.</p>
            <p><strong className="text-white">Controller / Operator:</strong> [Legal Entity Name]. <strong className="text-white">Privacy contact:</strong> [Privacy Contact Email].</p>
          </Section>

          <Section title="2. Information We Collect">
            <p><strong className="text-white">Account information.</strong> Depending on how you sign up, this may include your name, username, email address, profile image, authentication identifiers, and account preferences.</p>
            <p><strong className="text-white">Entertainment activity.</strong> We may collect titles you search for, watch, rate, favorite, add to your watchlist or queue, mark as disliked, and related timestamps or viewing metadata that you choose to provide.</p>
            <p><strong className="text-white">Taste and profile data.</strong> Dex may derive genres, themes, preferences, taste vectors, taste patterns, achievements, statistics, recommendation signals, and profile attributes from your activity. Derived taste data is used to operate and personalize Dex.</p>
            <p><strong className="text-white">Social information.</strong> If social features are enabled and you use them, we may collect follows, friends, shared lists, compatibility interactions, public profile information, and content you choose to share.</p>
            <p><strong className="text-white">Device and usage information.</strong> We may collect IP address, browser and device type, operating system, approximate location inferred from IP, pages or screens viewed, timestamps, referring URLs, crash information, and similar technical data.</p>
            <p><strong className="text-white">Cookies and similar technologies.</strong> We may use cookies, local storage, SDKs, and similar technologies for authentication, security, preferences, analytics, and service functionality. Where required, we will request consent for non-essential technologies.</p>
            <p><strong className="text-white">Support communications.</strong> If you contact us, we may collect the information you provide and information needed to respond.</p>
          </Section>

          <Section title="3. How We Collect Information">
            <p>We collect information directly from you, automatically from your device or browser, from authentication or integration providers you choose to use, and from service providers that process information on our behalf.</p>
          </Section>

          <Section title="4. How We Use Information">
            <p>We may use information to provide, personalize, maintain, secure, and improve Dex; create recommendations and taste insights; generate statistics, badges, and profile features; provide social features you request; communicate about the Service; prevent fraud and abuse; diagnose technical problems; comply with legal obligations; and protect the rights and safety of Dex, our users, and others.</p>
            <p>We may use aggregated or de-identified information for analytics, research, service improvement, and product development when it can no longer reasonably identify you.</p>
          </Section>

          <Section title="5. Recommendations and Personalization">
            <p>Dex may use your activity and derived taste information to rank, filter, and explain recommendations. Recommendations are informational and are not guarantees of quality, availability, or suitability.</p>
            <p>We do not treat your entertainment taste as a psychological, medical, or financial profile.</p>
          </Section>

          <Section title="6. How We Share Information">
            <p>We may share information with service providers that host, authenticate, secure, analyze, or operate Dex; business partners when necessary to provide a feature you request; other users when you intentionally make profile or social information public; professional advisers; authorities when required by law; and parties involved in a merger, acquisition, financing, reorganization, or sale of assets, subject to applicable law.</p>
            <p>Dex should not represent that it “never shares data” unless its technical and business practices actually support that promise. We do not sell personal information for money unless this policy is updated and applicable law permits it.</p>
          </Section>

          <Section title="7. Third-Party Services and Content">
            <p>Dex may rely on third-party services for authentication, databases, hosting, analytics, content metadata, streaming availability, payments, communications, or other functionality. Those providers may process information under their own terms and privacy policies. Dex is not responsible for independent third-party sites, services, or content.</p>
          </Section>

          <Section title="8. Data Retention">
            <p>We retain information for as long as reasonably necessary to provide the Service, maintain security, comply with legal obligations, resolve disputes, enforce agreements, and support legitimate business purposes. Retention periods may differ by data type. We intend to avoid retaining personal information longer than reasonably necessary.</p>
          </Section>

          <Section title="9. Your Privacy Choices and Rights">
            <p>Depending on where you live, you may have rights to access, correct, delete, export, restrict, object to, or otherwise control certain personal information. You may also have rights relating to consent, targeted advertising, sale or sharing of information, and automated decision-making.</p>
            <p>For California residents, applicable law may provide rights including know/access, delete, correct, opt out of sale or sharing, limit certain uses, and non-discrimination for exercising rights. For users in the EEA/UK, applicable data-protection law may provide rights including access, rectification, erasure, restriction, objection, portability, and complaint to a supervisory authority.</p>
            <p>To exercise a privacy right, contact <strong className="text-white">[Privacy Contact Email]</strong>. We may need to verify your identity before completing certain requests.</p>
          </Section>

          <Section title="10. Data Export and Account Deletion">
            <p>Where supported, Dex will provide tools to export your account data and request deletion. Some information may be retained where required by law, necessary to establish or defend legal claims, or otherwise permitted by applicable law.</p>
          </Section>

          <Section title="11. Security">
            <p>We use reasonable administrative, technical, and organizational safeguards appropriate to the nature of the information we process. No internet transmission or storage system is guaranteed to be completely secure.</p>
          </Section>

          <Section title="12. International Transfers">
            <p>Dex and its service providers may process information in countries other than your own. Where required, we will use lawful transfer mechanisms and appropriate safeguards.</p>
          </Section>

          <Section title="13. Children">
            <p>Dex is not intended for children under the minimum age required by applicable law. Where a service is subject to children’s privacy laws such as COPPA, we will comply with the requirements that apply. If you believe a child has provided personal information improperly, contact us so we can investigate and delete it when required.</p>
          </Section>

          <Section title="14. Changes to This Policy">
            <p>We may update this policy as Dex, technology, or legal requirements change. We will update the effective date and, where appropriate, provide additional notice for material changes.</p>
          </Section>

          <Section title="15. Contact">
            <p>For privacy questions or requests, contact: <strong className="text-white">[Privacy Contact Email]</strong>.</p>
          </Section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
