import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "About Us | BoostMySkills",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main id="main" className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1
            className="text-3xl md:text-4xl font-bold mb-10"
            style={{ color: "var(--bms-dark)" }}
          >
            About us
          </h1>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <p>
              It is forecasted that by 2030, there will be 38 million jobs in
              the renewable energy and sustainability sector, a 216% increase
              versus 2020. However, without the implementation of proactive
              measures, where a new approach is taken to rapidly upskill and
              reskill individuals, only half of these jobs will be filled, due
              to skills shortages.
            </p>

            <p>
              Developed by pan-European and other international universities,
              funded by parties that include the EU and Swiss Confederation, and
              supported by the United Nations Institute for Training &amp;
              Research (UNITAR), BoostMySkills aims to upskill students and
              members of the workforce, to drive the green transition, in
              support of a low carbon economy.
            </p>

            <p>
              BoostMySkills has developed an innovative educational framework
              based on micro-programmes and micro-credentials to drive rapid
              upskilling across renewable energy and sustainability.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
