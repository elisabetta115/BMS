import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProgrammeCard from "@/components/ProgrammeCard";
import { programmes } from "@/lib/data";

export default function ProgramsPage() {
  return (
    <>
      <Header />
      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-10" style={{ color: "var(--bms-dark)" }}>All Micro-programmes</h1>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {programmes.map((p) => (
              <ProgrammeCard key={p.id} programme={p} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
