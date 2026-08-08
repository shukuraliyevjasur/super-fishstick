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
}

function statusLabel(status: string, b: Dict["broadcasts"]) {
  if (status === "SENDING") return b.statusSending;
  if (status === "COMPLETED") return b.statusCompleted;
  return b.statusDraft;
}

export default function BroadcastList({
  initialBroadcasts,
  flows,
  dict: b,
}: Props) {
  const router = useRouter();
  const [composing, setComposing] = useState(false);

  // A sent broadcast keeps moving after the request returns — the worker is
  // still draining batches — so refresh rather than optimistically inserting a
  // row whose counters would immediately be stale.
  function handleSent() {
    setComposing(false);
    router.refresh();
  }

  const broadcasts = initialBroadcasts;

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
