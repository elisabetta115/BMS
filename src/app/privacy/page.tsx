import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Privacy Policy | BoostMySkills",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="bms-legal">
          <h1 className="bms-legal-title">
            Privacy Policy
          </h1>

          <div className="bms-legal-body">
            <section>
              <h2 className="bms-legal-heading">
                1. Introduction
              </h2>
              <p className="bms-legal-paragraph">
                BoostMySkills (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
                &ldquo;our&rdquo;) is committed to protecting your personal
                data and respecting your privacy. This Privacy Policy explains
                how we collect, use, store, and protect information about you
                when you use our website and services. It also describes your
                rights under applicable data protection law, including the
                General Data Protection Regulation (GDPR).
              </p>
            </section>

            <section>
              <h2 className="bms-legal-heading">
                2. Data We Collect
              </h2>
              <p className="bms-legal-paragraph">
                When you register for an account or use our platform, we collect
                the following personal data:
              </p>
              <ul className="bms-legal-list">
                <li>Full name</li>
                <li>Email address</li>
                <li>Country of residence</li>
                <li>Password (stored in hashed form — we never store your plain-text password)</li>
                <li>Course and programme enrolment records</li>
                <li>Learning progress, including unit completions and quiz results</li>
              </ul>
            </section>

            <section>
              <h2 className="bms-legal-heading">
                3. How We Use Your Data
              </h2>
              <p className="bms-legal-paragraph">We use your personal data to:</p>
              <ul className="bms-legal-list">
                <li>Create and manage your account</li>
                <li>Provide access to micro-credentials and micro-programmes</li>
                <li>Track your learning progress and calculate your grades</li>
                <li>Communicate with you about your account or our services</li>
                <li>Improve our platform and content</li>
                <li>Comply with our legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="bms-legal-heading">
                4. Legal Basis for Processing
              </h2>
              <p className="bms-legal-paragraph">
                We process your personal data on the following legal bases under
                GDPR: performance of a contract (to provide you with our
                services), your consent (where required), and our legitimate
                interests (to improve and secure our platform). Where we rely on
                consent, you may withdraw it at any time.
              </p>
            </section>

            <section>
              <h2 className="bms-legal-heading">
                5. Data Storage and Security
              </h2>
              <p className="bms-legal-paragraph">
                Your data is stored on secure servers. We implement appropriate
                technical and organisational measures to protect your personal
                data against unauthorised access, loss, or destruction. Your
                password is hashed using bcrypt before storage and is never
                accessible in plain text, even by us. We retain your personal
                data for as long as your account is active or as necessary to
                provide our services. You may request deletion of your account
                and associated data at any time.
              </p>
            </section>

            <section>
              <h2 className="bms-legal-heading">
                6. Cookies and Session Data
              </h2>
              <p className="bms-legal-paragraph">
                We use a single session cookie (<code>bms_session</code>) to
                keep you logged in. This cookie contains a signed, encrypted
                token and expires after 7 days. We do not use tracking or
                advertising cookies. For more information, please see our{" "}
                <a href="/cookie_policy" className="underline hover:text-gray-900">
                  Cookie Policy
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="bms-legal-heading">
                7. Sharing Your Data
              </h2>
              <p className="bms-legal-paragraph">
                We do not sell, trade, or rent your personal data to third
                parties. We may share data with trusted service providers who
                assist us in operating our platform (such as cloud hosting
                providers), strictly under confidentiality agreements and only
                to the extent necessary to provide our services. We may also
                disclose data where required by law.
              </p>
            </section>

            <section>
              <h2 className="bms-legal-heading">
                8. Your Rights
              </h2>
              <p className="bms-legal-paragraph">
                Under GDPR, you have the following rights regarding your
                personal data:
              </p>
              <ul className="bms-legal-list">
                <li><strong>Access:</strong> request a copy of the data we hold about you</li>
                <li><strong>Rectification:</strong> request correction of inaccurate data</li>
                <li><strong>Erasure:</strong> request deletion of your personal data</li>
                <li><strong>Restriction:</strong> request that we limit how we use your data</li>
                <li><strong>Portability:</strong> request your data in a structured, machine-readable format</li>
                <li><strong>Objection:</strong> object to processing based on legitimate interests</li>
              </ul>
              <p className="bms-legal-paragraph">
                To exercise any of these rights, please contact us using the
                details in Section 10 below.
              </p>
            </section>

            <section>
              <h2 className="bms-legal-heading">
                9. Changes to This Policy
              </h2>
              <p className="bms-legal-paragraph">
                We may update this Privacy Policy from time to time. Any changes
                will be posted on this page with an updated effective date. We
                encourage you to review this policy periodically. Your continued
                use of the platform after any changes constitutes your acceptance
                of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="bms-legal-heading">
                10. Contact Information
              </h2>
              <p className="bms-legal-paragraph">
                If you have any questions about this Privacy Policy or wish to
                exercise your data rights, please contact us. You also have the
                right to lodge a complaint with your national data protection
                authority.
              </p>
            </section>
          </div>
      </section>
      </main>
      <Footer />
    </>
  );
}
