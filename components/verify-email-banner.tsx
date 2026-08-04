"use client";

import { useState, useTransition } from "react";
import { useDict } from "@/components/dictionary-provider";
import { resendVerification } from "@/app/[lang]/(dashboard)/verify-actions";

/**
 * Shown until the signed-in user confirms their address. Nothing is blocked
 * while it is up — signup deliberately does not gate access on verification.
 */
export default function VerifyEmailBanner({ lang = "uz" }: { lang?: string }) {
  const dict = useDict();
  const v = dict.verifyEmail;
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
      <p className="text-sm text-foreground">{v.banner}</p>
      {sent ? (
        <span className="text-sm font-medium text-success">{v.sent}</span>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await resendVerification(lang);
              if (result.ok) setSent(true);
            })
          }
          className="text-sm font-semibold text-accent hover:underline disabled:opacity-50"
        >
          {v.resend}
        </button>
      )}
    </div>
  );
}
