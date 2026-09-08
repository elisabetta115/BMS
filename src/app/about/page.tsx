import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "About Us | BoostMySkills",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="bms-about">
          <h1 className="bms-about-title">About us</h1>

          <p className="bms-about-paragraph">
            It is forecasted that by 2030, there will be 38 million jobs in the renewable energy and sustainability
            sector, a 216% increase versus 2020. However, without the implementation of proactive measures, where a new
            approach is taken to rapidly upskill and reskill individuals, only half of these jobs will be filled, due to
            skills shortages.
          </p>

          <p className="bms-about-paragraph">
            Developed by pan-European and other international universities, funded by parties that include the EU and
            Swiss Confederation, and supported by the United Nations Institute for Training &amp; Research (UNITAR),
            BoostMySkills aims to upskill students and members of the workforce, to drive the green transition, in support
            of a low carbon economy.
          </p>

          <p className="bms-about-paragraph">
            BoostMySkills has developed an innovative educational framework based on micro-programmes and
            micro-credentials to drive rapid upskilling across renewable energy and sustainability.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
