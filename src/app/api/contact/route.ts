import { NextRequest, NextResponse } from "next/server";
import { validateEmail } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { emails, sendToInbox } from "@/lib/email";

const HOUR_MS = 60 * 60 * 1000;
const TOO_MANY = "Too many messages have been sent. Please try again later.";
const SENT = { message: "Thanks for your message! We'll get back to you as soon as we can." };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: NextRequest) {
  // The contact inbox is the same mailbox that sends sign-in emails, and Tophost caps
  // the whole domain at about 500 emails an hour, so a flood of contact messages must
  // not be able to use that up: a few per visitor, and a ceiling for the whole site.
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`contact:${ip}`, { max: 5, windowMs: HOUR_MS }).allowed) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) ?? {};
  // Hidden field that people never see; bots that fill in every field get a
  // normal-looking answer and nothing is sent.
  if (text(body.website)) return NextResponse.json(SENT);

  const firstName = text(body.firstName);
  const lastName = text(body.lastName);
  const email = text(body.email);
  const message = text(body.message);

  if (!firstName || !lastName || !email || !message) {
    return NextResponse.json({ error: "Please fill in your name, email and message." }, { status: 400 });
  }
  if (firstName.length > 100 || lastName.length > 100) {
    return NextResponse.json({ error: "Names can be at most 100 characters." }, { status: 400 });
  }
  if (email.length > 254 || !validateEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: "Your message can be at most 5000 characters." }, { status: 400 });
  }

  // Names go into the subject and Reply-To headers, so keep them on one line.
  const name = `${firstName} ${lastName}`.replace(/\s+/g, " ");

  if (!rateLimit("contact:all", { max: 50, windowMs: HOUR_MS }).allowed) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  }

  try {
    await sendToInbox(emails.contactMessage(name, email, message), { name, address: email });
    return NextResponse.json(SENT);
  } catch (err) {
    console.error("Contact form error:", err);
    return NextResponse.json(
      { error: "We couldn't send your message right now. Please try again in a few minutes." },
      { status: 503 }
    );
  }
}
