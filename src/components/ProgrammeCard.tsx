import { Programme } from "@/lib/data";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function ProgrammeCard({ programme }: { programme: Programme }) {
  const detailHref = `/programs/${programme.id}`;

  return (
    <article className="bms-program-card">
      <Link aria-label={programme.title} href={detailHref}>
        <div className="bms-card-image flex items-center justify-center">
          {programme.image ? (
            <img
              src={programme.image}
              alt={programme.title}
              className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-4xl font-bold text-brand-green/30">{programme.code}</span>
          )}
        </div>
      </Link>
      <div className="bms-card-body">
        <h3 className="bms-card-title">
          <Link href={detailHref}>{programme.title}</Link>
        </h3>
        <div className="mb-8">
          <p className="bms-card-meta">
            {programme.code} | {programme.project}
          </p>
          <p className="bms-card-list-title">Includes the following micro-credentials:</p>
        </div>
        <ul className="bms-card-list">
          {programme.credentials.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
        <div className="bms-card-actions">
          <Link className="bms-pill" href={detailHref}>
            Enrol
            <ArrowRight aria-hidden="true" size={18} strokeWidth={2.5} style={{ marginLeft: "0.5rem" }} />
          </Link>
        </div>
      </div>
    </article>
  );
}
