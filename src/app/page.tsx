import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProgrammeCard from "@/components/ProgrammeCard";
import { programmes } from "@/lib/data";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Header />
      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden" style={{ background: "#ffff" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--bms-green)" }}>
                  FREE fully funded courses
                </p>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6" style={{ color: "var(--bms-dark)" }}>
                  Become a leader in sustainability
                </h1>
                <p className="text-gray-600 leading-relaxed mb-8 max-w-lg">
                  Accelerate and future proof your career in sustainability or gain the skills to advance your
                  organisations sustainability initiatives, through courses developed by pan-European and international
                  universities - co-funded by the EU, Swiss Confederation and a consortia of South Korean universities
                  (COSS) - and supported by the United Nations Institute for Training &amp; Research (UNITAR)
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/programs"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium text-sm transition-colors"
                    style={{ background: "var(--bms-green)" }}
                  >
                    Explore Micro-programmes
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                  </Link>
                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm border-2 transition-colors"
                    style={{ borderColor: "var(--bms-green)", color: "var(--bms-green)" }}
                  >
                    Explore Micro-credentials
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--bms-green)"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                  </Link>
                </div>
              </div>
              <div className="hidden md:flex justify-center">
                <img src="/images/landing_img.png" alt="landing page image" className="w-full max-w-md" />
              </div>
            </div>
          </div>
        </section>

        {/* Trending Programmes */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--bms-green)" }}>Discover</p>
            <h2 className="text-3xl font-bold mb-10" style={{ color: "var(--bms-dark)" }}>Our Trending Micro-programmes</h2>
            <div className="programme-carousel">
              {programmes.map((p) => (
                <ProgrammeCard key={p.id} programme={p} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/programs" className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--bms-dark)" }}>
                View all Micro-programmes
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Certificates */}
        <section className="py-16" style={{ background: "#ffff" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--bms-green)" }}>Earn BoostMySkills</p>
            <h2 className="text-3xl font-bold mb-6" style={{ color: "var(--bms-dark)" }}>Micro-credential and Micro-programme Certificates</h2>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Develop and advance your expertise with our comprehensive micro-credential and micro-programme courses.
                  Gain practical knowledge and skills to drive energy innovations and decarbonisation strategies.
                </p>
                <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--bms-green-light)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1a8a5c"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z" /></svg>
                  </div>
                  <p className="text-sm text-gray-600">
                    Developed by pan-European and international universities, co-funded by the EU, Swiss Confederation
                    and a consortia of South Korean universities (COSS) - and supported by the United Nations Institute
                    for Training &amp; Research (UNITAR)
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <img src="/images/r4c-certificate.png" alt="certificate" className="w-full max-w-sm rounded-2xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Choose your option */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--bms-green)" }}>Expand your Knowledge with Specialised Learning Paths</p>
            <h2 className="text-3xl font-bold mb-4" style={{ color: "var(--bms-dark)" }}>Choose your option</h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-12">
              Choose a micro-programme, where each micro-programme consists of 10 micro-credentials.
              Or choose one or more individual micro-credentials.
            </p>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Micro-programmes card */}
              <div className="rounded-2xl border-2 border-[#1a8a5c] p-10 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#e6f5ee" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#1a8a5c"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                </div>
                <h4 className="font-bold text-xl mb-4" style={{ color: "var(--bms-dark)" }}>Micro-programmes</h4>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  Deepen your expertise with our comprehensive micro-programmes designed to cover a wide range of topics in renewable energy
                </p>
                <Link
                  href="/programs"
                  className="inline-block px-8 py-3 rounded-full text-white text-sm font-semibold"
                  style={{ background: "var(--bms-green)" }}
                >
                  View all
                </Link>
              </div>

              {/* Micro-credentials card */}
              <div className="rounded-2xl border-2 border-gray-300 p-10 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#e6f5ee" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1a8a5c"><path d="M7 2v11h3v9l7-12h-4l4-8z" /></svg>
                </div>
                <h4 className="font-bold text-xl mb-4" style={{ color: "var(--bms-dark)" }}>Micro-credentials</h4>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  Boost your skill set with our targeted micro-credentials. These concise courses are ideal for those looking to enhance specific competencies
                </p>
                <Link
                  href="/courses"
                  className="inline-block px-8 py-3 rounded-full text-white text-sm font-semibold"
                  style={{ background: "var(--bms-dark)" }}
                >
                  View all
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Steps */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-16 items-start">
              {/* Left: title area */}
              <div>
                <p className="text-sm font-semibold italic mb-3" style={{ color: "var(--bms-green)" }}>How to get started?</p>
                <h3 className="text-3xl font-bold mb-6" style={{ color: "var(--bms-dark)" }}>Get started in 3 simple steps</h3>
                <p className="text-gray-500 leading-relaxed">
                  Achieve your learning goals quickly by following these straight-forward steps
                </p>
              </div>

              {/* Right: steps */}
              <div className="space-y-10">
                {[
                  { n: 1, title: "First Step", text: "Create your free account and explore our diverse range of micro-programmes and micro-credentials" },
                  { n: 2, title: "Second Step", text: "Choose the micro-programmes and/or micro-credentials that align with your goals and interests." },
                  { n: 3, title: "Third Step", text: "Start learning at your own pace and earn your certifications to boost your skills and career prospects." },
                ].map((step) => (
                  <div key={step.n} className="flex gap-5">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                      style={{ background: "#e6f5ee", color: "var(--bms-green)" }}
                    >
                      {step.n}
                    </div>
                    <div>
                      <h5 className="font-bold text-base mb-1.5" style={{ color: "var(--bms-dark)" }}>{step.title}</h5>
                      <p className="text-gray-500 text-sm leading-relaxed">{step.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              {/* Left: device image */}
              <div className="hidden md:block">
                <img src="/images/home-page.png" alt="ipad image" className="w-full max-w-md" />
              </div>

              {/* Right: benefits content */}
              <div>
                <p className="text-sm font-semibold italic mb-3" style={{ color: "var(--bms-green)" }}>
                  Certifications to boost your skills and career prospects
                </p>
                <h3 className="text-3xl font-bold mb-12" style={{ color: "var(--bms-dark)" }}>Benefits of BoostMySkills</h3>
                <div className="grid grid-cols-2 gap-x-12 gap-y-10">
                  <div>
                    <svg width="40" height="40" viewBox="0 0 24 24" className="mb-5"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="#1a1a2e"/></svg>
                    <p className="text-gray-500 leading-relaxed">Up skill for a Greener Future: Gain in-demand sustainability expertise and become a leader in the green economy</p>
                  </div>
                  <div>
                    <svg width="40" height="40" viewBox="0 0 24 24" className="mb-5"><circle cx="12" cy="12" r="10" fill="#1a1a2e"/></svg>
                    <p className="text-gray-500 leading-relaxed">Flexible Learning: Learn at your own pace, anytime, anywhere with our online courses and resources.</p>
                  </div>
                  <div>
                    <svg width="40" height="40" viewBox="0 0 24 24" className="mb-5"><path d="M7 2v11h3v9l7-12h-4l4-8z" fill="#1a1a2e"/></svg>
                    <p className="text-gray-500 leading-relaxed">Practical Skills: Apply your knowledge through real-world projects and case studies.</p>
                  </div>
                  <div>
                    <svg width="40" height="40" viewBox="0 0 24 24" className="mb-5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#1a1a2e"/></svg>
                    <p className="text-gray-500 leading-relaxed">Positive Impact: Contribute to a sustainable future by developing solutions to environmental challenges.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ color: "var(--bms-dark)" }}>What People Are Saying</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { quote: "I was amazed by the breadth of renewable energy courses offered. I highly recommend BoostMySkills to anyone passionate about creating a sustainable future", name: "Anya Petrova", role: "Sustainability Consultant" },
                { quote: "The practical skills I gained have already helped me implement sustainable practices in my workplace", name: "Maria Gonzalez", role: "Renewable Energy Engineer" },
                { quote: "BoostMySkills helped me discover my passion for renewable energy and sustainability and explore potential career paths", name: "David Kim", role: "Student" },
              ].map((t, i) => (
                <div key={i} className="rounded-2xl p-6 border border-gray-200 bg-white">
                  <p className="text-gray-600 text-sm leading-relaxed mb-8">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#c8e6c9" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#2e7d32">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--bms-dark)" }}>{t.name}</p>
                      <p className="text-gray-400 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Partners */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-2xl font-bold mb-8 text-center" style={{ color: "var(--bms-dark)" }}>Our Partners</h3>
            <div className="space-y-6">
              <div>
                <img src="/images/partners.jpeg" alt="partners" className="w-full" />
              </div>
              <div className="rounded-2xl p-8" style={{ background: "#e8f5e9" }}>
                <img src="/images/extra_partners.png" alt="extra partners" className="w-full" />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}