"use client";

import { useState, FormEvent } from "react";
import { ArrowRight } from "lucide-react";

const EMPTY = { firstName: "", lastName: "", email: "", message: "", website: "" };

export default function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof EMPTY) {
    return (e: { target: { value: string } }) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please fill in your name, email and message.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSent(data.message);
        setForm(EMPTY);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="bms-contact-sent">
        <p className="bms-auth-status" role="status">
          {sent}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="bms-contact-field">
        <label htmlFor="contact-first-name">Name</label>
        <div className="bms-contact-name">
          <input
            id="contact-first-name"
            type="text"
            placeholder="First Name"
            aria-label="First Name"
            autoComplete="given-name"
            maxLength={100}
            required
            value={form.firstName}
            onChange={set("firstName")}
          />
          <input
            type="text"
            placeholder="Last Name"
            aria-label="Last Name"
            autoComplete="family-name"
            maxLength={100}
            required
            value={form.lastName}
            onChange={set("lastName")}
          />
        </div>
      </div>

      <div className="bms-contact-field">
        <label htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          type="email"
          placeholder="Your Email"
          autoComplete="email"
          maxLength={254}
          required
          value={form.email}
          onChange={set("email")}
        />
      </div>

      <div className="bms-contact-field">
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          placeholder="Your Message"
          maxLength={5000}
          required
          value={form.message}
          onChange={set("message")}
        />
      </div>

      {/* Left empty by people (it's hidden); bots that fill it in are ignored by the server. */}
      <div className="bms-contact-trap" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={set("website")}
        />
      </div>

      {error && (
        <span className="bms-auth-error" role="alert">
          {error}
        </span>
      )}

      <button type="submit" disabled={loading}>
        {loading ? "Sending…" : "Submit"}
        <ArrowRight aria-hidden="true" size={20} />
      </button>
    </form>
  );
}
