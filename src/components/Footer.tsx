import Link from "next/link";
import { footerColumns } from "@/data/navigation";
import { siteConfig } from "@/data/site";

function FooterLink({ href, label }: { href: string; label: string }) {
  const className = "text-[1.05rem] font-semibold leading-[1.55rem] text-brand-dark transition-colors hover:text-brand-green";
  if (href.startsWith("http")) {
    return (
      <a className={className} href={href} rel="noreferrer" target="_blank">
        {label}
      </a>
    );
  }
  return (
    <Link className={className} href={href}>
      {label}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-10 py-10 pl-6 pr-14 md:flex-row md:items-start md:justify-between md:gap-8 lg:pl-8">
        <Link aria-label="BoostMySkills home" href="/" className="shrink-0">
          <img src="/logos/boostmyskills-logo.png" alt="BoostMySkills" className="h-12 w-auto" />
        </Link>

        {footerColumns.map((column, i) => (
          <ul className="space-y-2.5" key={column.heading ?? `col-${i}`}>
            {column.heading ? (
              <li className="text-xl font-bold leading-[1.55rem] text-brand-dark">{column.heading}</li>
            ) : null}
            {column.links.map((link) => (
              <li key={link.href}>
                <FooterLink href={link.href} label={link.label} />
              </li>
            ))}
            {column.social ? (
              <li className="pt-2">
                <a
                  aria-label="BoostMySkills on LinkedIn"
                  className="inline-flex"
                  href={siteConfig.social.linkedin}
                  rel="noreferrer"
                  target="_blank"
                >
                  <img alt="LinkedIn" src="/icons/linkedin.png" className="h-[22px] w-[22px]" />
                </a>
              </li>
            ) : null}
          </ul>
        ))}
      </div>
    </footer>
  );
}
