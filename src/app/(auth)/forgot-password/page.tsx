import { Suspense } from "react";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export const metadata = { title: "Forgot Password — Sona" };

export default function ForgotPasswordPage() {
  return (
    <div className="stage">
      <div className="orb a" />
      <div className="orb b" />
      <main className="card auth-card">
        <Suspense>
          <ForgotPasswordForm />
        </Suspense>
      </main>
    </div>
  );
}
