import nodemailer, { type Transporter } from "nodemailer";
import { siteConfig } from "@/data/site";
import { TOKEN_TTL_HOURS } from "@/lib/email-tokens";

// Emails go out through the info@boostmyskills.org mailbox (Tophost/Seeweb):
// SMTP_HOST=mail.tophost.it, SMTP_USER=<the Mailbox name>, SMTP_PASSWORD=<its password>,
// SMTP_FROM=info@boostmyskills.org. Tophost mail logins use the Mailbox name shown in
// its control panel, not the email address (the webmail accepts either).
// Tophost allows about 500 emails an hour and 1000 a day for the whole domain.
const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER;
const password = process.env.SMTP_PASSWORD;
const from = process.env.SMTP_FROM || (user?.includes("@") ? user : undefined);

let _transport: Transporter | null = null;

function getTransport(): Transporter {
  if (_transport) return _transport;
  _transport = nodemailer.createTransport({
    host,
    port,
    // 465 is encrypted from the start; on 587 STARTTLS is required, so the
    // password is never sent unencrypted. The server's certificate is checked.
    secure: port === 465,
    requireTLS: true,
    auth: { user, pass: password },
    // Don't leave a sign-up request hanging if the mail server is slow.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return _transport;
}

/**
 * Site address used in email links. Comes from APP_URL rather than the request,
 * so a forged Host header can't make a reset link point at another site.
 */
export function appUrl(): string {
  const url = process.env.APP_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  if (!url) throw new Error("APP_URL is not set.");
  return url.replace(/\/+$/, "");
}

export interface EmailMessage {
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(to: string, message: EmailMessage, options: { replyTo?: { name: string; address: string } } = {}): Promise<void> {
  if (!host || !user || !password || !from) {
    // Local development without a mailbox: print the email so its link can be opened from the terminal.
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n──── Email (SMTP not configured, not sent) ────\nTo: ${to}\nSubject: ${message.subject}\n\n${message.text}\n───────────────────────────────────────────────\n`);
      return;
    }
    throw new Error("Email is not configured: set SMTP_HOST, SMTP_USER, SMTP_PASSWORD and SMTP_FROM.");
  }

  await getTransport().sendMail({
    // Sent as the mailbox's own address, so replies land in the same inbox.
    from: { name: siteConfig.name, address: from },
    to,
    replyTo: options.replyTo,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
}

/**
 * Sends a message to the site's own mailbox (the one the sign-in emails come from),
 * with Reply-To set to the visitor so answering it from the inbox goes back to them.
 */
export async function sendToInbox(message: EmailMessage, replyTo: { name: string; address: string }): Promise<void> {
  await sendEmail(from ?? "(site mailbox)", message, { replyTo });
}

/* ─── Templates ─────────────────────────────────────────── */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function hours(n: number): string {
  return n === 1 ? "1 hour" : `${n} hours`;
}

/**
 * One layout for every email: logo, heading, paragraphs, optional quoted block, optional green button.
 * Paragraphs and the quote are plain text; the quote keeps its line breaks.
 */
function render({
  subject,
  heading,
  paragraphs,
  quote,
  button,
  footer,
}: {
  subject: string;
  heading: string;
  paragraphs: string[];
  quote?: string;
  button?: { label: string; url: string };
  footer: string;
}): EmailMessage {
  const base = appUrl();
  const p = (t: string) => `<p style="font-size:16px;line-height:1.5;margin:0 0 16px">${escapeHtml(t)}</p>`;
  const buttonHtml = button
    ? `<p style="margin:28px 0"><a href="${escapeHtml(button.url)}" style="background:#079845;border-radius:8px;color:#ffffff;display:inline-block;font-size:16px;font-weight:bold;padding:14px 26px;text-decoration:none">${escapeHtml(button.label)}</a></p>
<p style="color:#767676;font-size:13px;line-height:1.5;margin:0 0 16px">If the button doesn't work, copy this link into your browser:<br><a href="${escapeHtml(button.url)}" style="color:#079845;word-break:break-all">${escapeHtml(button.url)}</a></p>`
    : "";
  const quoteHtml = quote
    ? `<div style="background:#f4f4f4;border-left:4px solid #079845;font-size:16px;line-height:1.5;margin:0 0 16px;padding:12px 16px;white-space:pre-wrap">${escapeHtml(quote)}</div>`
    : "";

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="background:#f4f4f4;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;margin:0;padding:0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;max-width:560px;padding:32px"><tr><td>
<img src="${escapeHtml(base)}/logos/boostmyskills-logo.png" alt="${escapeHtml(siteConfig.name)}" width="122" height="56" style="display:block;margin:0 0 24px">
<h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(heading)}</h1>
${paragraphs.map(p).join("\n")}
${quoteHtml}
${buttonHtml}
<p style="border-top:1px solid #e5e5e5;color:#767676;font-size:13px;line-height:1.5;margin:24px 0 0;padding-top:16px">${escapeHtml(footer)}</p>
</td></tr></table>
</td></tr></table>
</body></html>`;

  const text = [
    heading,
    "",
    ...paragraphs.flatMap((t) => [t, ""]),
    ...(quote ? [quote, ""] : []),
    ...(button ? [`${button.label}: ${button.url}`, ""] : []),
    footer,
  ].join("\n");

  return { subject, html, text };
}

export const emails = {
  verifyEmail(name: string, url: string): EmailMessage {
    return render({
      subject: `Confirm your email for ${siteConfig.name}`,
      heading: "Confirm your email",
      paragraphs: [
        `Hi ${name},`,
        `Thanks for registering with ${siteConfig.name}. Please confirm your email address to activate your account.`,
      ],
      button: { label: "Confirm my email", url },
      footer: `This link works for ${hours(TOKEN_TTL_HOURS.VERIFY_EMAIL)}. If you didn't create an account, you can ignore this email.`,
    });
  },

  resetPassword(name: string, url: string): EmailMessage {
    return render({
      subject: `Reset your ${siteConfig.name} password`,
      heading: "Reset your password",
      paragraphs: [`Hi ${name},`, `We received a request to reset the password for your ${siteConfig.name} account.`],
      button: { label: "Reset my password", url },
      footer: `This link works for ${hours(TOKEN_TTL_HOURS.RESET_PASSWORD)} and can be used once. If you didn't ask for this, you can ignore this email: your password stays the same.`,
    });
  },

  confirmEmailChange(name: string, newEmail: string, url: string): EmailMessage {
    return render({
      subject: `Confirm your new email for ${siteConfig.name}`,
      heading: "Confirm your new email",
      paragraphs: [
        `Hi ${name},`,
        `You asked to change the email address of your ${siteConfig.name} account to ${newEmail}. Your account keeps using the old address until you confirm.`,
      ],
      button: { label: "Confirm new email", url },
      footer: `This link works for ${hours(TOKEN_TTL_HOURS.CHANGE_EMAIL)}. If you didn't ask for this, you can ignore this email.`,
    });
  },

  /** Sent to the old address once an email change is confirmed. */
  emailChanged(name: string, newEmail: string): EmailMessage {
    return render({
      subject: `Your ${siteConfig.name} email was changed`,
      heading: "Your email was changed",
      paragraphs: [
        `Hi ${name},`,
        `The email address of your ${siteConfig.name} account was changed to ${newEmail}. From now on, sign-in and account emails go to that address.`,
      ],
      footer: "If you didn't make this change, reply to this email right away so we can help you.",
    });
  },

  passwordChanged(name: string): EmailMessage {
    return render({
      subject: `Your ${siteConfig.name} password was changed`,
      heading: "Your password was changed",
      paragraphs: [`Hi ${name},`, `The password of your ${siteConfig.name} account was just changed.`],
      button: { label: "I didn't do this: reset my password", url: `${appUrl()}/forgot-password` },
      footer: "If you changed it yourself, you don't need to do anything. If not, reset your password with the button above and reply to this email to let us know.",
    });
  },

  /** A message from the contact page, delivered to the site's own mailbox. */
  contactMessage(name: string, email: string, message: string): EmailMessage {
    return render({
      subject: `Contact form: message from ${name}`,
      heading: "New message from the contact form",
      paragraphs: [`From: ${name} (${email})`],
      quote: message,
      footer: `Sent from ${appUrl()}/contact. Reply to this email to answer ${name} directly.`,
    });
  },
};
