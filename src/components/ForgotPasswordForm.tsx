"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";
import { emailOk } from "@/lib/validation";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = (): string => {
    if (!emailOk(email)) return "That email looks off.";
    return "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError("");
    setBusy(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          // Route through the callback so PKCE `code` is exchanged server-side,
          // then redirect to the reset form with a valid session.
          redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
        }
      );
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-confirm">
        <h2>Check your email.</h2>
        <p>
          We sent a password reset link to <b>{email.trim()}</b>. Click it to set a new password.
        </p>
        <Link className="foot-link" href="/login">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <h2 className="auth-title">Reset your password.</h2>
      <p style={{ fontSize: "14px", color: "var(--ink-soft)", marginBottom: "16px" }}>
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input 
          id="email" 
          type="email" 
          value={email} 
          placeholder="you@email.com" 
          onChange={(e) => setEmail(e.target.value)} 
          autoComplete="email"
        />
      </div>

      {error && <div className="err auth-err">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? (
          <span className="sending">
            <span className="spinner" /> Sending…
          </span>
        ) : (
          "Send reset link"
        )}
      </button>

      <p className="auth-switch">
        Remember your password? <Link href="/login">Log in</Link>
      </p>
    </form>
  );
}
