"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";
import { emailOk } from "@/lib/validation";

type Mode = "login" | "signup";

const COPY: Record<Mode, { title: string; cta: string; busy: string }> = {
  login: { title: "Welcome back.", cta: "Log in", busy: "Logging in…" },
  signup: { title: "Create your Sona account.", cta: "Sign up", busy: "Signing up…" },
};

/** Maps Supabase auth errors to warm, actionable messages. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered")) return "An account with that email already exists — try logging in.";
  if (m.includes("not confirmed")) return "Please confirm your email first — check your inbox for our link.";
  if (m.includes("invalid login credentials")) return "That email and password don't match.";
  return message;
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const validate = (): string => {
    if (mode === "signup" && !displayName.trim()) return "Please add your name.";
    if (!emailOk(email)) return "That email looks off.";
    if (password.length < 8) return "Password needs at least 8 characters.";
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
      if (mode === "signup") {
        // Check if email already exists before attempting signup
        const checkRes = await fetch("/api/auth/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        
        if (checkRes.ok) {
          const { exists } = await checkRes.json();
          if (exists) {
            throw new Error("An account with that email already exists — try logging in.");
          }
        }
        // If check fails, continue with signup (fail open)
        
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: `${getSiteUrl()}/auth/callback`,
          },
        });
        if (error) throw error;
        setConfirmSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        router.push(params.get("next") || "/voicenotes");
        router.refresh();
      }
    } catch (err) {
      setError(friendlyAuthError(err instanceof Error ? err.message : "Something went wrong."));
    } finally {
      setBusy(false);
    }
  };

  if (confirmSent) {
    return (
      <div className="auth-confirm">
        <h2>Check your email.</h2>
        <p>
          We sent a confirmation link to <b>{email.trim()}</b>. Click it, then log in.
        </p>
        <Link className="foot-link" href="/login">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <h2 className="auth-title">{COPY[mode].title}</h2>

      {mode === "signup" && (
        <div className="field">
          <label htmlFor="displayName">Your name</label>
          <input id="displayName" value={displayName} placeholder="Eleanor" onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} placeholder="you@email.com" onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          placeholder="At least 8 characters"
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
        {mode === "login" && (
          <Link href="/forgot-password" style={{ fontSize: "13px", color: "var(--accent-deep)", marginTop: "6px", display: "inline-block" }}>
            Forgot password?
          </Link>
        )}
      </div>

      {error && <div className="err auth-err">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? (
          <span className="sending">
            <span className="spinner" /> {COPY[mode].busy}
          </span>
        ) : (
          COPY[mode].cta
        )}
      </button>

      <p className="auth-switch">
        {mode === "signup" ? (
          <>
            Already have an account? <Link href="/login">Log in</Link>
          </>
        ) : (
          <>
            New to Sona? <Link href="/signup">Create an account</Link>
          </>
        )}
      </p>
    </form>
  );
}
