import { Programme } from "@/lib/data";
import Link from "next/link";

export default function ProgrammeCard({ programme }: { programme: Programme }) {
  return (
    <div className="programme-card bg-white rounded-2xl shadow-md overflow-hidden flex flex-col">
      {/* Image placeholder */}
      <div className="h-48 bg-gradient-to-br from-[var(--bms-green)] to-[var(--bms-blue)] relative flex items-center justify-center">
        <span className="text-white/40 text-6xl font-bold">{programme.code}</span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h4 className="font-semibold text-base leading-snug mb-1">{programme.title}</h4>
        <p className="text-xs text-gray-500 mb-3">
          {programme.code} | {programme.project}
        </p>

        <p className="text-xs font-medium text-gray-600 mb-2">
          Includes the following micro-credentials:
        </p>
        <ul className="text-xs text-gray-500 space-y-0.5 mb-4 flex-1">
          {programme.credentials.map((c, i) => (
            <li key={i} className="flex gap-1">
              <span className="text-[var(--bms-green)]">•</span> {c}
            </li>
          ))}
        </ul>

        <Link
          href={`/programs/${programme.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-full self-start transition-colors"
          style={{ background: "var(--bms-green)" }}
        >
          Enrol
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
