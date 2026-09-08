import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main">
        <section className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-4xl font-bold text-brand-dark">Page not found</h1>
          <p className="mt-4 text-lg text-brand-muted">The page you are looking for does not exist.</p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-brand-green px-8 py-3 font-bold text-white transition-colors hover:bg-brand-green-dark"
          >
            Return home
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
