import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Log in — Dearly" };

export default function LoginPage() {
  return (
    <div className="stage">
      <div className="orb a" />
      <div className="orb b" />
      <main className="card auth-card">
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </main>
    </div>
  );
}
