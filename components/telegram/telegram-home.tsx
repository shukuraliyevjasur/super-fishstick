"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { t } from "@/components/dictionary-provider";
import type { TelegramDashboardData } from "@/lib/data/telegram-dashboard";
import type { Dict } from "@/lib/i18n/types";

type Props = {
  dict: Dict["telegram"];
  lang: string;
  botReady: boolean;
  botUsername: string | null;
  dashboard: TelegramDashboardData | null;
};

function BotSetup({
  dict,
  onConnected,
}: {
  dict: Dict["telegram"];
  onConnected: () => void;
}) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await fetch("/api/telegram/own-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error("invalid");
      setToken("");
      onConnected();
    } catch {
      setError(dict.invalidToken);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel mx-auto max-w-2xl rounded-lg p-6 sm:p-8">
      <div className="mx-auto max-w-xl space-y-2 text-center">
        <p className="text-base font-bold text-foreground">{dict.setupTitle}</p>
        <p className="text-sm leading-6 text-muted">{dict.setupDesc}</p>
      </div>

      <form onSubmit={connect} className="mx-auto mt-6 max-w-xl space-y-4">
        <label className="block text-left text-xs font-medium text-muted">
          {dict.tokenLabel}
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder={dict.tokenPlaceholder}
            autoComplete="off"
            spellCheck={false}
            required
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-mono text-foreground outline-none transition-colors focus:border-accent"
          />
        </label>

        <div className="mx-auto max-w-md overflow-hidden rounded-lg border border-border bg-background text-left">
          <video
            controls
            playsInline
            preload="metadata"
            className="block aspect-video w-full bg-foreground"
            aria-label={dict.tutorialLabel}
          >
            <source src="/broadcastttutorial.mp4" type="video/mp4" />
            {dict.tutorialFallback}
          </video>
          <p className="px-3 py-2 text-xs text-muted">{dict.tutorialLabel}</p>
        </div>

        {error && <p role="alert" className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={saving || !token.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? dict.connecting : dict.connect}
        </button>
      </form>

      <p className="mx-auto mt-6 max-w-xl border-t border-border pt-4 text-center text-xs leading-5 text-subtle">
        {dict.setupNote}
      </p>
    </section>
  );
}

function DisconnectBot({
  dict,
  onDisconnected,
}: {
  dict: Dict["telegram"];
  onDisconnected: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = typed.trim() === dict.disconnectWord;

  async function disconnect() {
    if (!ready) return;
    setRemoving(true);
    setError(null);
    try {
      const response = await fetch("/api/telegram/own-bot", { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error("failed");
      onDisconnected();
    } catch {
      setError(dict.disconnectFailed);
    } finally {
      setRemoving(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-error transition-colors hover:text-error/80"
      >
        {dict.disconnect}
      </button>
    );
  }

  return (
    <div className="mt-4 max-w-md rounded-lg border border-error/30 bg-error/5 p-4">
      <p className="text-sm font-semibold text-foreground">{dict.disconnectTitle}</p>
      <p className="mt-1 text-sm text-muted">{dict.disconnectDesc}</p>
      <label className="mt-3 block text-xs font-medium text-muted">
        {t(dict.disconnectTypeLabel, { word: dict.disconnectWord })}
        <input
          autoFocus
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-error"
        />
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => void disconnect()}
          disabled={!ready || removing}
          className="rounded-md bg-error px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {removing ? dict.disconnecting : dict.disconnectConfirm}
        </button>
        <button
          type="button"
          disabled={removing}
          onClick={() => { setConfirming(false); setTyped(""); setError(null); }}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground"
        >
          {dict.cancel}
        </button>
      </div>
    </div>
  );
}

export default function TelegramHome({ dict, lang, botReady: initialBotReady, botUsername, dashboard }: Props) {
  const router = useRouter();
  const [botReady, setBotReady] = useState(initialBotReady);

  if (!botReady || !dashboard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">{dict.title}</h1>
          <p className="mt-1 text-sm text-muted">{dict.subtitle}</p>
        </div>
        <BotSetup dict={dict} onConnected={() => { setBotReady(true); router.refresh(); }} />
      </div>
    );
  }

  const stats = [
    { label: dict.statContacts, value: dashboard.contacts },
    { label: dict.statBroadcastMessages, value: dashboard.broadcastMessagesSent },
    { label: dict.statCompletedBroadcasts, value: dashboard.completedBroadcasts },
    { label: dict.statActiveFlows, value: dashboard.activeFlows },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">{dict.title}</h1>
          <p className="mt-1 text-sm text-muted">{dict.subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">{t(dict.connectedBot, { username: botUsername ?? "Telegram" })}</p>
          <DisconnectBot dict={dict} onDisconnected={() => { setBotReady(false); router.refresh(); }} />
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={dict.statsLabel}>
        {stats.map((stat) => (
          <div key={stat.label} className="panel rounded-lg p-4">
            <p className="text-2xl font-bold tabular-nums text-foreground">{stat.value.toLocaleString()}</p>
            <p className="mt-1 text-sm text-muted">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel rounded-lg p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-foreground">{dict.flowPerformance}</h2>
              <p className="mt-1 text-sm text-muted">{dict.flowPerformanceDesc}</p>
            </div>
            <Link href={`/${lang}/flows`} className="text-sm font-semibold text-accent hover:underline">{dict.openFlows}</Link>
          </div>
          {dashboard.flows.length === 0 ? (
            <p className="mt-5 text-sm text-muted">{dict.noFlows}</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {dashboard.flows.slice(0, 5).map((flow) => (
                <li key={flow.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-foreground">{flow.name}</span>
                  <span className="shrink-0 text-muted">{t(dict.flowInteractions, { count: flow.conversationCount })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel rounded-lg p-5">
          <div>
            <h2 className="font-bold text-foreground">{dict.nextTitle}</h2>
            <p className="mt-1 text-sm text-muted">{dict.nextDesc}</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/${lang}/flows`} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-border-hover hover:bg-surface-hover">{dict.openFlows}</Link>
            <Link href={`/${lang}/broadcasts`} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover">{dict.openBroadcasts}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
