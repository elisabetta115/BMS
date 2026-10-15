import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { siteConfig } from "@/data/site";
import ContactForm from "./ContactForm";

export const metadata = {
  title: "Contact Us | BoostMySkills",
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="bms-contact">
          <div className="bms-contact-intro">
            <h1>Let&rsquo;s get in touch!</h1>
            <p>Contact us if you have questions about BoostMySkills.</p>
            <div className="bms-contact-follow">
              <h2>Follow us</h2>
              <a
                aria-label="BoostMySkills on LinkedIn"
                href={siteConfig.social.linkedin}
                rel="noreferrer"
                target="_blank"
              >
                <img alt="LinkedIn" src="/icons/linkedin.png" className="h-[22px] w-[22px]" />
              </a>
            </div>
          </div>
          <ContactForm />
        </section>
      </main>
      <Footer />
    </>
  );
}
