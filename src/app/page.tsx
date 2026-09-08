"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProgrammeCard from "@/components/ProgrammeCard";
import ProgrammeCarousel from "@/components/ProgrammeCarousel";
import { Programme } from "@/lib/data";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const optionCards = [
  {
    image: "/images/heart.png",
    title: "Micro-programmes",
    text: "Deepen your expertise with our comprehensive micro-programmes designed to cover a wide range of topics in renewable energy",
    href: "/programs",
  },
  {
    image: "/images/optionicon.png",
    title: "Micro-credentials",
    text: "Boost your skill set with our targeted micro-credentials. These concise courses are ideal for those looking to enhance specific competencies",
    href: "/courses",
  },
];

const steps = [
  { title: "First Step", text: "Create your free account and explore our diverse range of micro-programmes and micro-credentials" },
  { title: "Second Step", text: "Choose the micro-programmes and/or micro-credentials that align with your goals and interests." },
  { title: "Third Step", text: "Start learning at your own pace and earn your certifications to boost your skills and career prospects." },
];

const benefits = [
  { icon: "/images/star.png", text: "Up skill for a Greener Future: Gain in-demand sustainability expertise and become a leader in the green economy" },
  { icon: "/images/labelicon.png", text: "Flexible Learning: Learn at your own pace, anytime, anywhere with our online courses and resources." },
  { icon: "/images/lightningicon.png", text: "Practical Skills: Apply your knowledge through real-world projects and case studies." },
  { icon: "/images/heart-black.png", text: "Positive Impact: Contribute to a sustainable future by developing solutions to environmental challenges." },
];

const testimonials = [
  { quote: "I was amazed by the breadth of renewable energy courses offered. I highly recommend BoostMySkills to anyone passionate about creating a sustainable future", name: "Anya Petrova", role: "Sustainability Consultant" },
  { quote: "The practical skills I gained have already helped me implement sustainable practices in my workplace", name: "Maria Gonzalez", role: "Renewable Energy Engineer" },
  { quote: "BoostMySkills helped me discover my passion for renewable energy and sustainability and explore potential career paths", name: "David Kim", role: "Student" },
];

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          router.replace("/dashboard");
          return;
        }
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [router]);

  useEffect(() => {
    fetch("/api/micro-programmes")
      .then((r) => r.json())
      .then((data) => {
        const mapped: Programme[] = (data.programmes || []).map(
          (p: {
            id: string;
            slug: string;
            title: string;
            code: string;
            project: string;
            hasImage?: boolean;
            credentials?: { title: string }[];
          }) => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            code: p.code,
            project: p.project,
            image: p.hasImage ? `/api/images/programme/${p.id}` : "",
            credentials: (p.credentials || []).map((c) => c.title),
          })
        );
        setProgrammes(mapped);
      })
      .catch(() => {});
  }, []);

  if (!checked) return null;

  return (
    <>
      <Header />
      <main id="main">
        <section className="bms-page bms-hero">
          <div>
            <p className="bms-hero-eyebrow">FREE fully funded courses</p>
            <h1 className="bms-hero-title">Become a leader in sustainability</h1>
            <p className="bms-hero-text">
              Accelerate and future proof your career in sustainability or gain the skills to advance your organisations
              sustainability initiatives, through courses developed by pan-European and international universities -
              co-funded by the EU, Swiss Confederation and a consortia of South Korean universities (COSS) - and supported
              by the United Nations Institute for Training &amp; Research (UNITAR)
            </p>
            <div className="bms-hero-actions flex flex-wrap">
              <Link
                className="bms-hero-cta inline-flex items-center justify-center rounded-full bg-brand-green font-bold text-white transition-colors hover:bg-brand-green-dark"
                href="/programs"
              >
                Explore Micro-programmes
                <ArrowRight aria-hidden="true" size={22} />
              </Link>
              <Link
                className="bms-hero-cta inline-flex items-center justify-center rounded-full border border-brand-green font-bold text-brand-green transition-colors hover:bg-brand-pale"
                href="/courses"
              >
                Explore Micro-credentials
                <ArrowRight aria-hidden="true" size={22} />
              </Link>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[532px]">
            <img
              alt="Learners building sustainability skills"
              src="/images/landing.png"
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        </section>

        <section className="bms-section bms-home-programmes">
          <span className="bms-section-eyebrow">Discover</span>
          <h2 className="bms-section-title">Our Trending Micro-programmes</h2>
          {programmes.length > 0 && (
            <>
              <ProgrammeCarousel>
                {programmes.map((p) => (
                  <ProgrammeCard key={p.id} programme={p} />
                ))}
              </ProgrammeCarousel>
              <Link className="bms-view-all" href="/programs">
                View all Micro-programmes <ArrowRight aria-hidden="true" size={18} />
              </Link>
            </>
          )}
        </section>

        <section className="bms-certificate">
          <div className="bms-certificate-content">
            <span className="bms-section-eyebrow">Earn BoostMySkills</span>
            <h2 className="bms-certificate-title">Micro-credential and Micro-programme Certificates</h2>
            <p className="bms-certificate-text">
              Develop and advance your expertise with our comprehensive micro-credential and micro-programme courses. Gain
              practical knowledge and skills to drive energy innovations and decarbonisation strategies.
            </p>
            <div className="bms-certified">
              <img alt="certified icon" height={48} width={48} src="/images/certified.png" />
              <p>
                Developed by pan-European and international universities, co-funded by the EU, Swiss Confederation and a
                consortia of South Korean universities (COSS) - and supported by the United Nations Institute for Training
                &amp; Research (UNITAR)
              </p>
            </div>
          </div>
          <div className="bms-certificate-image">
            <img alt="diploma image" src="/images/r4c-certificate.png" style={{ height: "auto" }} width={650} />
          </div>
        </section>

        <section className="bms-options">
          <div className="bms-options-heading">
            <span className="bms-section-eyebrow">Expand your Knowledge with Specialised Learning Paths</span>
            <h2 className="bms-options-title">Choose your option</h2>
            <p className="bms-text">
              Choose a micro-programme, where each micro-programme consists of 10 micro-credentials. Or choose one or more
              individual micro-credentials.
            </p>
          </div>
          <div className="bms-options-grid">
            {optionCards.map((option, index) => (
              <div className={index === 0 ? "bms-option-card bms-option-featured" : "bms-option-card"} key={option.title}>
                <img alt="" className="bms-option-icon" height={72} width={72} src={option.image} />
                <h3>{option.title}</h3>
                <p>{option.text}</p>
                <Link className="bms-option-button" href={option.href}>
                  View all
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="bms-steps">
          <div className="bms-steps-copy">
            <span className="bms-section-eyebrow">How to get started?</span>
            <h2>Get started in 3 simple steps</h2>
            <p className="bms-text">Achieve your learning goals quickly by following these straight-forward steps</p>
          </div>
          <ol className="bms-steps-list">
            {steps.map((step, index) => (
              <li key={step.title}>
                <span>{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="bms-benefits">
          <div className="bms-benefits-image">
            <img alt="ipad image" src="/images/home-page-img.png" style={{ height: "auto" }} width={720} />
          </div>
          <div className="bms-benefits-content">
            <span className="bms-section-eyebrow">Certifications to boost your skills and career prospects</span>
            <h2>Benefits of BoostMySkills</h2>
            <div className="bms-benefits-grid">
              {benefits.map((benefit) => (
                <div className="bms-benefit" key={benefit.text}>
                  <img alt="" height={32} width={32} src={benefit.icon} />
                  <p>{benefit.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bms-testimonials">
          <h2>What People Are Saying</h2>
          <div className="bms-testimonials-grid">
            {testimonials.map((testimonial) => (
              <article className="bms-testimonial" key={testimonial.name}>
                <p>&quot;{testimonial.quote}&quot;</p>
                <div className="bms-client">
                  <div className="bms-client-avatar">
                    <img alt="" height={16} width={16} src="/images/useravatar.png" />
                  </div>
                  <div>
                    <strong>{testimonial.name}</strong>
                    <span>{testimonial.role}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bms-partners">
          <h2>Our Partners</h2>
          <img alt="partner image" src="/images/partners.jpeg" style={{ height: "auto" }} width={1440} />
          <div className="bms-extra-partners">
            <img alt="extra partners image" src="/images/extra-partners.png" style={{ height: "auto", width: "100%" }} width={1346} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
