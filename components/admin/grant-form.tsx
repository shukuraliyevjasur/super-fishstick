"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLANS = [
  { value: "FREE", label: "Free" },
  { value: "STANDART", label: "Standard" },
  { value: "PRO", label: "Pro" },
  { value: "AGENCY", label: "Agency" },
] as const;

interface Props {
  workspaceId: string;
  currentPlan: string;
}

export default function GrantForm({ workspaceId, currentPlan }: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState(currentPlan);
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    setSaving(true);

    const body: Record<string, unknown> = { workspaceId, plan };
    if (reason.trim()) body.reason = reason.trim();
    if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();

    const res = await fetch("/api/admin/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = await res.json();
    setSaving(false);

    if (payload.success) {
      setResult({ ok: true, msg: `Granted ${plan}` });
      setReason("");
      setExpiresAt("");
      router.refresh();
    } else {
      setResult({ ok: false, msg: payload.error ?? "Failed" });
    }
  }

  const unchanged = plan === currentPlan && !expiresAt && !reason.trim();

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border pt-4 grid gap-3 sm:grid-cols-[1fr_180px_1fr_auto]"
    >
      {/* Plan */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1">Plan</label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent transition-colors"
        >
          {PLANS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Expiry */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1">
          Expires (optional)
        </label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Reason */}
      <div>
        <label className="block text-xs font-medium text-muted mb-1">
          Reason (optional)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. paid via Click, refund"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Submit */}
      <div className="flex flex-col justify-end">
        <button
          type="submit"
          disabled={saving || unchanged}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
        >
          {saving ? "Saving…" : "Grant"}
        </button>
      </div>

      {/* Feedback */}
      {result && (
        <p
          className={`sm:col-span-4 text-xs font-medium ${result.ok ? "text-success" : "text-error"}`}
        >
          {result.msg}
        </p>
      )}
    </form>
  );
}
