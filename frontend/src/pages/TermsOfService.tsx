import React from 'react';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
    <div className="space-y-3 text-sm leading-7 text-[#A7AFC2] sm:text-base">{children}</div>
  </section>
);

export const TermsOfService: React.FC = () => {
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
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Terms of Service</h1>
          <p className="mt-4 text-sm text-[#64748B]">Effective date: August 26, 2026</p>
          <p className="mt-6 text-base leading-7 text-[#A7AFC2]">
            These Terms of Service govern your access to and use of Dex websites, applications, and related services. By accessing or using Dex, you agree to these Terms.
          </p>
          <p className="mt-4 text-sm leading-6 text-[#64748B]">
            Replace the bracketed legal entity, jurisdiction, and contact details before public launch. This is a comprehensive product draft, not a substitute for jurisdiction-specific legal advice.
          </p>
        </div>

        <div className="space-y-10">
          <Section title="1. About Dex">
            <p>Dex is an entertainment identity and discovery service. Features may include watch tracking, ratings, recommendations, taste analysis, profiles, statistics, achievements, social features, lists, memories, and other entertainment-related tools. Features may change, be added, or removed over time.</p>
          </Section>

          <Section title="2. Eligibility">
            <p>You may use Dex only if you can legally enter into a binding agreement under the laws applicable to you. Dex is not intended for children under the minimum age required by applicable law. If you are using Dex on behalf of an organization, you represent that you have authority to bind that organization.</p>
          </Section>

          <Section title="3. Accounts">
            <p>You are responsible for maintaining accurate account information and for protecting your credentials. You are responsible for activity occurring through your account unless you promptly report unauthorized access. Do not share credentials or impersonate another person.</p>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree not to misuse Dex, interfere with its operation, attempt unauthorized access, scrape or harvest data without permission, reverse engineer or circumvent security controls, upload malware, abuse APIs or rate limits, manipulate rankings or recommendation systems, impersonate others, harass users, or use Dex for unlawful or fraudulent activity.</p>
            <p>You must comply with applicable laws and respect intellectual-property, privacy, publicity, and other rights of third parties.</p>
          </Section>

          <Section title="5. User Content and Profile Information">
            <p>You retain ownership of content you submit to Dex, subject to the licenses necessary for Dex to operate the Service. By submitting content, you grant Dex a worldwide, non-exclusive, royalty-free license to host, store, reproduce, format, display, distribute within the Service, and otherwise process that content as reasonably necessary to provide and improve the features you request.</p>
            <p>You represent that you have the rights necessary to submit the content and that your content does not violate law or the rights of others. You should not upload content that is unlawful, infringing, deceptive, abusive, or malicious.</p>
          </Section>

          <Section title="6. Public Profiles and Social Features">
            <p>If Dex provides public profiles, friends, follows, shared lists, taste compatibility, rankings, or similar features, information you choose to make public may be visible to other users and may be copied, shared, or indexed outside Dex. Review your privacy settings before publishing information.</p>
            <p>Dex does not guarantee the accuracy, conduct, identity, or intentions of other users. Interactions with other users are your responsibility.</p>
          </Section>

          <Section title="7. Recommendations and Entertainment Information">
            <p>Dex recommendations, taste scores, statistics, badges, availability information, descriptions, rankings, and other entertainment information are provided for discovery and informational purposes. They may be incomplete, inaccurate, delayed, personalized, or unavailable in your location.</p>
            <p>A recommendation score is not a guarantee that you will enjoy a title. Streaming availability, release information, ratings, and third-party metadata may change without notice.</p>
          </Section>

          <Section title="8. Third-Party Content and Services">
            <p>Dex may display or link to third-party metadata, artwork, streaming services, authentication providers, payment processors, analytics services, or other third-party products. Third-party services are governed by their own terms and policies. Dex does not control and is not responsible for independent third-party services.</p>
          </Section>

          <Section title="9. Intellectual Property">
            <p>Dex and its original software, branding, logos, interface, text, designs, and other materials are owned by or licensed to Dex and are protected by applicable intellectual-property laws. Except as expressly allowed by Dex, you may not copy, modify, distribute, sell, reverse engineer, publicly perform, or create derivative works from Dex materials.</p>
            <p>Movie, series, poster, artwork, character, actor, studio, and other third-party intellectual property remains the property of its respective owners. Your use of Dex does not transfer ownership of that content.</p>
          </Section>

          <Section title="10. Feedback">
            <p>If you provide ideas, suggestions, bug reports, or other feedback, you grant Dex permission to use that feedback without restriction or compensation, including to improve or develop the Service.</p>
          </Section>

          <Section title="11. Availability and Changes">
            <p>We may modify, suspend, or discontinue part or all of Dex, temporarily or permanently, including for maintenance, security, legal, business, or technical reasons. We do not guarantee that Dex will always be available, uninterrupted, secure, or error-free.</p>
          </Section>

          <Section title="12. Free and Paid Features">
            <p>If Dex offers paid plans, prices, billing periods, renewal terms, taxes, cancellation rules, refunds, and feature limits will be presented at the point of purchase or in the applicable plan terms. Paid subscriptions may renew automatically unless cancelled before renewal where applicable.</p>
            <p>We may change pricing or paid features with appropriate notice as required by law.</p>
          </Section>

          <Section title="13. Termination">
            <p>You may stop using Dex and request account deletion subject to applicable law and the procedures described in the Privacy Policy. Dex may suspend or terminate accounts that violate these Terms, create security or legal risks, abuse the Service, or otherwise justify intervention under applicable law.</p>
            <p>Sections that by their nature should survive termination, including intellectual property, disclaimers, limitations of liability, indemnification, dispute provisions, and applicable law, will survive.</p>
          </Section>

          <Section title="14. Disclaimers">
            <p>To the maximum extent permitted by law, Dex is provided on an “as is” and “as available” basis. Dex disclaims warranties not expressly stated in these Terms, including implied warranties of merchantability, fitness for a particular purpose, non-infringement, availability, accuracy, and reliability, except where such disclaimers are not permitted by law.</p>
            <p>Dex is not responsible for third-party content, streaming availability, user-generated content, or decisions you make based on recommendations or information presented through the Service.</p>
          </Section>

          <Section title="15. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law, Dex and its officers, directors, employees, affiliates, and service providers will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or loss of profits, data, goodwill, or business arising from or related to your use of the Service.</p>
            <p>Where liability cannot be excluded, the aggregate liability of Dex for claims arising from the Service will be limited to the greater of the amount you paid Dex for the Service during the preceding twelve months or the minimum amount permitted by applicable law. Some jurisdictions do not allow certain limitations, so portions of this section may not apply to you.</p>
          </Section>

          <Section title="16. Indemnification">
            <p>To the extent permitted by law, you agree to defend, indemnify, and hold harmless Dex and its officers, directors, employees, and agents from claims, liabilities, damages, losses, and expenses arising from your violation of these Terms, misuse of the Service, unlawful conduct, or infringement of another party’s rights.</p>
          </Section>

          <Section title="17. Disputes and Governing Law">
            <p>These Terms are governed by the laws of <strong className="text-white">[Governing Jurisdiction]</strong>, without regard to conflict-of-law rules, except where mandatory consumer laws provide otherwise.</p>
            <p>Any dispute-resolution process, arbitration requirement, class-action waiver, venue, or court jurisdiction must be finalized with legal counsel for the jurisdictions in which Dex operates before launch.</p>
          </Section>

          <Section title="18. Changes to These Terms">
            <p>We may update these Terms as Dex, our business, or legal requirements change. When changes are material, we will provide notice as required by law. Continued use of Dex after the effective date of updated Terms constitutes acceptance to the extent permitted by law.</p>
          </Section>

          <Section title="19. General Terms">
            <p>If any provision of these Terms is found unenforceable, the remaining provisions will remain in effect to the extent permitted by law. Our failure to enforce a provision is not a waiver of our right to do so later. These Terms, together with documents expressly incorporated by reference, form the agreement between you and Dex concerning the Service.</p>
          </Section>

          <Section title="20. Contact">
            <p>Questions about these Terms should be sent to <strong className="text-white">[Legal Contact Email]</strong>.</p>
          </Section>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
