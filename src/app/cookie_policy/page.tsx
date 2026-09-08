import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Cookie Policy | BoostMySkills",
};

export default function CookiePolicyPage() {
  return (
    <>
      <Header />
      <main id="main" className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1
            className="text-3xl md:text-4xl font-bold mb-10"
            style={{ color: "var(--bms-dark)" }}
          >
            Cookie Policy
          </h1>

          <div className="space-y-8 text-gray-600 leading-relaxed">
            {/* Section 1: Introduction */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: "var(--bms-dark)" }}>
                1. Introduction
              </h2>
              <p>
                This document informs Users about the technologies that help this Website to achieve
                the purposes described below. Such technologies allow BoostMySkills to access and
                store information (for example by using a Cookie) or use resources (for example by
                running a script) on a User's device as they interact with this Website. For
                simplicity, all such technologies are defined as "Trackers" within this document –
                unless there is a reason to differentiate. For example, while Cookies can be used on
                both web and mobile browsers, it would be inaccurate to talk about Cookies in the
                context of mobile apps as they are a browser-based Tracker. For this reason, within
                this document, the term Cookies is only used where it is specifically meant to
                indicate that particular type of Tracker.
              </p>
              <p className="mt-3">
                Some of the purposes for which Trackers are used may also require the User's
                consent. Whenever consent is given, it can be freely withdrawn at any time
                following the instructions provided in this document. This Website uses Trackers
                managed directly by BoostMySkills (so-called "first-party" Trackers) and Trackers
                that enable services provided by a third-party (so-called "third-party" Trackers).
                Unless otherwise specified within this document, third-party providers may access
                the Trackers managed by them.
              </p>
            </section>

            {/* Section 2: Types and purposes of cookies */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: "var(--bms-dark)" }}>
                2. What type of cookies are used on this Website and for what purpose?
              </h2>
              <p>
                This Website uses its own and third party cookies.
                <br />
                <strong>Own cookies:</strong> are those that are sent to the user's terminal equipment from a
                computer or domain managed by the website Owner and from which the service requested by
                the user is provided.
                <br />
                <strong>Third-party cookies:</strong> are those that are sent to the user's terminal equipment
                from a computer or domain that is not managed by the publisher, but by another entity
                that processes the data obtained through cookies.
              </p>
              <p className="mt-3">
                This Website uses the following cookies for the purposes described below:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>
                  <strong>Technical:</strong> cookies used on this Website by BoostMySkills and, where
                  appropriate, by third parties, which allow the user to browse the Site and use the
                  different services provided therein, including those that allow the management and
                  operation of the website and its functions, such as the identification of sessions,
                  traffic, security during navigation and the storage of content for dissemination and
                  publication, such as videos, or to share through social networks. These cookies are
                  necessary.
                </li>
                <li>
                  <strong>Analytics:</strong> cookies used on this Website by the Owner and by third parties,
                  which allow the quantification of the number of users who visit the Site and perform
                  statistical measurements and analysis of the use made by users of the content and
                  services offered on the website. To do this, navigation on the Website is analyzed in
                  order to improve the offer of content, services and products offered and correct the
                  structure of the Website to improve the way of browsing it.
                </li>
                <li>
                  <strong>External social networks:</strong> cookies used on this Website by the owners of the
                  social networks to be able to interact with the different social platforms (e.g.
                  YouTube, LinkedIn or others) configured on this Website and / or by the own user of
                  these social networks.
                </li>
              </ul>
            </section>

            {/* Section 3: Who uses cookies on this Website? */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: "var(--bms-dark)" }}>
                3. Who uses cookies on this Website?
              </h2>
              <p>The following entities use the cookies described below for these purposes:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>
                  <strong>BoostMySkills</strong>
                  <br />
                  Type or Function: Technical
                  <br />
                  Server: https://boostmyskills.eu/
                  <br />
                  These cookies are necessary and therefore are excluded from the duty to obtain the
                  user's consent.
                </li>
                <li>
                  <strong>LinkedIn</strong>
                  <br />
                  Type or Function: External social networks
                  <br />
                  Server: http://www.linkedin.com
                  <br />
                  These cookies are not excluded from the duty to obtain consent, so the user must
                  authorize their use.
                </li>
              </ul>
            </section>

            {/* Section 4: How are the cookies on this Website accepted, rejected, revoked, or limited? */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: "var(--bms-dark)" }}>
                4. How are the cookies on this Website accepted, rejected, revoked, or limited?
              </h2>
              <p>
                Through the different options included in the notice of the use of cookies that is
                displayed when accessing this Website for the first time, the user can accept or
                reject the use of cookies on this Site and the international transfer of their data.
                For these purposes:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>
                  <strong>To accept all cookies:</strong> you must click on the ACCEPT COOKIES button.
                </li>
                <li>
                  <strong>To configure cookies:</strong> you must click on the CONFIGURE button and you will be
                  able to access the types of cookies that can be accepted or rejected. Necessary
                  cookies cannot be rejected.
                </li>
                <li>
                  <strong>Transfers:</strong> By accepting cookies from Google, Inc, the user also accepts the
                  international transfer of their personal data to the United States as reported in the
                  following section.
                </li>
                <li>
                  <strong>To revoke the consent granted:</strong> the cookies must be eliminated as indicated
                  below.
                </li>
              </ul>
              <p className="mt-3">
                Locating Tracker Settings - users can, for example, find information about how to
                manage Cookies in the most commonly used browsers at the websites of the following:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Google Chrome</li>
                <li>Mozilla Firefox</li>
                <li>Apple Safari</li>
                <li>Microsoft Internet Explorer</li>
                <li>Microsoft Edge</li>
                <li>Brave</li>
              </ul>
            </section>

            {/* Section 5: International data transfers */}
            <section>
              <h2 className="text-xl font-bold mb-3" style={{ color: "var(--bms-dark)" }}>
                5. Are international data transfers made from this Website?
              </h2>
              <p>
                Yes. The following third-party publisher carries out international transfers of data
                derived from cookies from this Website: Google, Inc. transfers data to the United
                States based on this adequacy, guarantee or exception decision:
                <br />
                User consent when accepting cookies by clicking the ACCEPT COOKIES button. When the
                user has accepted the use of cookies, they will be consenting that their data,
                collected through the loading and reading of cookies, be transferred to the United
                States, a country that currently does not offer an adequate level of protection
                according to the European Commission.
                <br />
                Therefore, if the user does not consent to this international transfer of their data
                to the United States, when accessing this Website for the first time and viewing the
                notice of the use of cookies, they must press the CONFIGURATION button to access the
                types of cookies that can be accepted or rejected. If cookies are rejected, the
                functionalities or services offered through the use of these cookies will not be
                provided or obtained.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
