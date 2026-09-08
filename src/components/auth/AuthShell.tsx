import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export function AuthShell({
  active,
  children,
}: {
  active: "login" | "register";
  children: React.ReactNode;
}) {
  const isLogin = active === "login";

  return (
    <div className="bms-auth-page">
      <section aria-label="BoostMySkills" className="bms-auth-intro">
        <Link aria-label="Go to BoostMySkills home page" className="bms-auth-logo" href="/">
          <img alt="BoostMySkills" src="/logos/boostmyskills-logo.png" width={122} height={56} />
        </Link>
        <h1>Start learning with BoostMySkills</h1>
        <p>100% free. No credit card needed.</p>
      </section>

      <section aria-label={isLogin ? "Sign in" : "Register"} className="bms-auth-card">
        <div aria-label="Authentication" className="bms-auth-tabs" role="tablist">
          <span aria-hidden="true" className={cn("bms-auth-tabs-pill", isLogin && "is-right")} />
          <Link
            aria-selected={!isLogin}
            className={cn("bms-auth-tab", !isLogin && "active")}
            href="/register"
            role="tab"
          >
            Register
          </Link>
          <Link
            aria-selected={isLogin}
            className={cn("bms-auth-tab", isLogin && "active")}
            href="/login"
            role="tab"
          >
            Sign in
          </Link>
        </div>
        {children}
      </section>
    </div>
  );
}

export function AuthField({
  label,
  error,
  icon,
  ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="bms-auth-label">
      {label}
      <span className="bms-auth-input-wrap">
        <input className="bms-auth-field" {...inputProps} />
        {icon}
      </span>
      {error ? <span className="bms-auth-error">{error}</span> : null}
    </label>
  );
}
