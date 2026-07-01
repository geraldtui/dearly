import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Sign up — Sona" };

export default function SignupPage() {
  return (
    <div className="stage">
      <div className="orb a" />
      <div className="orb b" />
      <main className="card auth-card">
        <Suspense>
          <AuthForm mode="signup" />
        </Suspense>
      </main>
    </div>
  );
}
