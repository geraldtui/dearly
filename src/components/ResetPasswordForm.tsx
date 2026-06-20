"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // PKCE flow: session is set by /auth/callback before we land here.
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
    };
    checkSession();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const validate = (): string => {
    if (password.length < 8) return "Password needs at least 8 characters.";
    if (password !== confirmPassword) return "Passwords don't match.";
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
      const { error } = await supabase.auth.updateUser({
        password,
      });
      if (error) throw error;
      setSuccess(true);
      // Redirect to chats after 2 seconds
      setTimeout(() => {
        router.push("/voicenotes");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (!hasSession) {
    return (
      <div className="auth-confirm">
        <h2>Invalid or expired link.</h2>
        <p>
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Link className="foot-link" href="/forgot-password">
          Request new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-confirm">
        <h2>Password updated!</h2>
        <p>Your password has been successfully reset. Redirecting to your account...</p>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <h2 className="auth-title">Set a new password.</h2>

      <div className="field">
        <label htmlFor="password">New password</label>
        <input
          id="password"
          type="password"
          value={password}
          placeholder="At least 8 characters"
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      <div className="field">
        <label htmlFor="confirmPassword">Confirm new password</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          placeholder="Re-enter your password"
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      {error && <div className="err auth-err">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? (
          <span className="sending">
            <span className="spinner" /> Updating…
          </span>
        ) : (
          "Reset password"
        )}
      </button>
    </form>
  );
}
