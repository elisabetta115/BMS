import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function CoursesPage() {
  return (
    <>
      <Header />
      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-4" style={{ color: "var(--bms-dark)" }}>Micro-credentials</h1>
          <p className="text-gray-600 mb-10 max-w-2xl">
            Browse our catalogue of individual micro-credentials. Each course provides targeted learning in a specific sustainability competency.
          </p>
          <div className="bg-gray-50 rounded-2xl p-12 text-center">
            <p className="text-gray-500 mb-4">Course catalogue content will be populated from your LMS.</p>
            <Link href="/" className="text-sm font-semibold" style={{ color: "var(--bms-green)" }}>Back to home</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
