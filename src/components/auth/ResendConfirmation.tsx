"use client";

import { useState } from "react";

/** "Send it again" for the sign-up confirmation email. Needs the credentials the person just typed. */
export function ResendConfirmation({ email, password }: { email: string; password: string }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function resend() {
    setSending(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || data.error || "Something went wrong. Please try again.");
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <p className="bms-auth-note">
        Can&apos;t find the email? Check your spam folder, or{" "}
        <button type="button" className="bms-auth-linkbtn" onClick={resend} disabled={sending}>
          {sending ? "sending…" : "send it again"}
        </button>
        .
      </p>
      {message && (
        <p className="bms-auth-note" role="status">
          {message}
        </p>
      )}
    </>
  );
}
