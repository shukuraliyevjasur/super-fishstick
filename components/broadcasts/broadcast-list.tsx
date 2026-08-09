"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/components/dictionary-provider";
import BroadcastComposer from "@/components/broadcasts/broadcast-composer";
import type { BroadcastSummary } from "@/lib/data/broadcasts";
import type { Dict } from "@/lib/i18n/types";

interface Props {
  initialBroadcasts: BroadcastSummary[];
  flows: { id: string; name: string }[];
  dict: Dict["broadcasts"];
  botReady: boolean;
}

function statusLabel(status: string, b: Dict["broadcasts"]) {
  if (status === "SENDING") return b.statusSending;
  if (status === "COMPLETED") return b.statusCompleted;
  return b.statusDraft;
}

function BotConnectForm({ b, onConnected }: { b: Dict["broadcasts"]; onConnected: () => void }) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/telegram/own-bot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const payload = await res.json();
    setSaving(false);
    if (payload.success) {
      onConnected();
    } else {
      setError(b.noBotInvalid);
    }
  }

  return (
    <div className="panel rounded-lg p-8 space-y-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{b.noBotTitle}</p>
        <p className="text-sm text-muted">{b.noBotDesc}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            {b.noBotTokenLabel}
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={b.noBotTokenPlaceholder}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground font-mono outline-none focus:border-accent transition-colors"
            required
          />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={saving || !token.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {saving ? b.noBotSaving : b.noBotSave}
        </button>
      </form>
    </div>
  );
}

export default function BroadcastList({
  initialBroadcasts,
  flows,
  dict: b,
  botReady: initialBotReady,
}: Props) {
  const router = useRouter();
  const [composing, setComposing] = useState(false);
  const [botReady, setBotReady] = useState(initialBotReady);

  // A sent broadcast keeps moving after the request returns — the worker is
  // still draining batches — so refresh rather than optimistically inserting a
  // row whose counters would immediately be stale.
  function handleSent() {
    setComposing(false);
    router.refresh();
  }

  const broadcasts = initialBroadcasts;

  if (!botReady) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">{b.title}</h1>
          <p className="mt-1 text-sm text-muted">{b.subtitle}</p>
        </div>
        <BotConnectForm b={b} onConnected={() => setBotReady(true)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">{b.title}</h1>
          <p className="mt-1 text-sm text-muted">{b.subtitle}</p>
        </div>

        {!composing && (
          <button
            onClick={() => setComposing(true)}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {b.newBtn}
          </button>
        )}
      </div>

      {composing && (
        <BroadcastComposer
          flows={flows}
          onSent={handleSent}
          onCancel={() => setComposing(false)}
          dict={b}
        />
      )}

      {broadcasts.length === 0 && !composing ? (
        <div className="panel rounded-lg p-6 text-center">
          <p className="text-sm font-semibold text-foreground">{b.emptyTitle}</p>
          <p className="mt-1 text-sm text-muted">{b.emptyDesc}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {broadcasts.map((broadcast) => (
            <li key={broadcast.id} className="panel rounded-md p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    broadcast.status === "SENDING"
                      ? "bg-accent/10 text-accent"
                      : "border border-border text-muted"
                  }`}
                >
                  {statusLabel(broadcast.status, b)}
                </span>
                <span className="text-xs text-muted">
                  {t(b.progress, {
                    sent: broadcast.sentCount,
                    total: broadcast.totalRecipients,
                  })}
                </span>
                {broadcast.failedCount > 0 && (
                  <span className="text-xs text-muted">
                    · {broadcast.failedCount}
                  </span>
                )}
              </div>

              <p className="mt-2 line-clamp-2 text-sm whitespace-pre-wrap text-foreground">
                {broadcast.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
