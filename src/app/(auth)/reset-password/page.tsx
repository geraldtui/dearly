import { Suspense } from "react";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata = { title: "Reset Password — Sona" };

export default function ResetPasswordPage() {
  return (
    <div className="stage">
      <div className="orb a" />
      <div className="orb b" />
      <main className="card auth-card">
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </div>
  );
}
