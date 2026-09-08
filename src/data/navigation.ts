export type NavChild = { label: string; href: string };
export type NavItem = { label: string; href: string; children?: NavChild[] };

export const primaryNavigation: NavItem[] = [
  {
    label: "Catalogue",
    href: "/programs",
    children: [
      { label: "Micro-programmes", href: "/programs" },
      { label: "Micro-credentials", href: "/courses" },
    ],
  },
  { label: "About us", href: "/about" },
];

export type FooterColumn = {
  heading?: string;
  social?: boolean;
  links: { label: string; href: string }[];
};

export const footerColumns: FooterColumn[] = [
  {
    links: [
      { label: "Self-Assessment", href: "https://www.res4city.eu/self-assessment/" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Cookie Policy", href: "/cookie_policy" },
      { label: "Terms and Conditions", href: "/tos" },
    ],
  },
  {
    heading: "Our projects",
    links: [
      { label: "RES4CITY", href: "https://www.res4city.eu/" },
      { label: "SHERLOCK", href: "https://www.sherlockproject.eu/" },
      { label: "COSS", href: "https://www.coss.ac.kr/" },
    ],
  },
  {
    heading: "Get in touch",
    social: true,
    links: [{ label: "About us", href: "/about" }],
  },
];
