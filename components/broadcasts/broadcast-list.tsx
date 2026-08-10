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
  botUsername: string | null;
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
    <div className="panel rounded-lg p-6 space-y-5">
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

        <div className="max-w-md overflow-hidden rounded-lg border border-border bg-background">
          <video
            controls
            playsInline
            preload="metadata"
            className="block aspect-video w-full bg-foreground"
            aria-label={b.noBotTutorialLabel}
          >
            <source src="/broadcastttutorial.mp4" type="video/mp4" />
            {b.noBotTutorialFallback}
          </video>
          <p className="px-3 py-2 text-xs text-muted">{b.noBotTutorialLabel}</p>
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

function DisconnectBotControl({
  b,
  botUsername,
  onDisconnected,
}: {
  b: Dict["broadcasts"];
  botUsername: string | null;
  onDisconnected: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDisconnect = typed.trim() === b.disconnectWord;

  async function disconnect() {
    if (!canDisconnect) return;
    setDisconnecting(true);
    setError(null);

    try {
      const response = await fetch("/api/telegram/own-bot", { method: "DELETE" });
      const payload = await response.json();

      if (payload.success) {
        onDisconnected();
        return;
      }
      setError(
        response.status === 409 ? b.disconnectBlocked : b.disconnectFailed
      );
    } catch {
      setError(b.disconnectFailed);
    } finally {
      setDisconnecting(false);
    }
  }

  if (!confirming) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs">
        <span className="text-muted">
          {t(b.botConnected, { username: botUsername ?? "Telegram" })}
        </span>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="font-medium text-error transition-colors hover:text-error/80 active:translate-y-px"
        >
          {b.disconnectBot}
        </button>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="disconnect-bot-title"
      className="w-full max-w-md rounded-lg border border-error/30 bg-error/5 p-4"
    >
      <h2 id="disconnect-bot-title" className="text-sm font-semibold text-foreground">
        {b.disconnectTitle}
      </h2>
      <p className="mt-1 text-sm text-muted">{b.disconnectDesc}</p>

      <label className="mt-4 block text-xs font-medium text-muted">
        {t(b.disconnectTypeLabel, { word: b.disconnectWord })}
        <input
          autoFocus
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-error"
        />
      </label>

      {error && (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void disconnect()}
          disabled={!canDisconnect || disconnecting}
          className="rounded-md bg-error px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-error/90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          {disconnecting ? b.disconnecting : b.disconnectConfirm}
        </button>
        <button
          type="button"
          disabled={disconnecting}
          onClick={() => {
            setConfirming(false);
            setTyped("");
            setError(null);
          }}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground active:translate-y-px disabled:opacity-50"
        >
          {b.disconnectCancel}
        </button>
      </div>
    </section>
  );
}

export default function BroadcastList({
  initialBroadcasts,
  flows,
  dict: b,
  botReady: initialBotReady,
  botUsername,
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
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover active:translate-y-px"
          >
            {b.newBtn}
          </button>
        )}
      </div>

      <div className="flex justify-end">
          <DisconnectBotControl
            b={b}
            botUsername={botUsername}
            onDisconnected={() => {
              setComposing(false);
              setBotReady(false);
              router.refresh();
            }}
          />
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
