import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Empty state shared by "My Micro-programmes" and "My Micro-credentials". */
export default function EmptyEnrolments() {
  return (
    <div className="bms-dash-empty">
      <div className="bms-dash-empty-art">
        <img src="/images/dashboard/empty-enrolments-live.svg" alt="" />
      </div>
      <div>
        <h2 className="bms-dash-empty-title">You are not enrolled in any micro-programme or micro-credential yet</h2>
        <div className="bms-dash-empty-actions">
          <Link className="bms-dash-cta" href="/programs">
            Enroll in micro-programmes <ArrowRight aria-hidden="true" size={18} />
          </Link>
          <Link className="bms-dash-cta" href="/courses">
            Enroll in micro-credentials <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
