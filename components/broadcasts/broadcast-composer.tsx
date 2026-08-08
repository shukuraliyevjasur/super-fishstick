"use client";

/**
 * Broadcast composer (T8).
 *
 * Three deliberate steps: compose, see the reach, type the word. The plan calls
 * this irreversible either way, and the UI is built so the irreversible click
 * is never the one your finger is already resting on — composing and sending
 * are different buttons, in different states, with a count in between.
 */

import { useState } from "react";
import { t } from "@/components/dictionary-provider";
import type { Dict } from "@/lib/i18n/types";

interface Props {
  flows: { id: string; name: string }[];
  onSent: () => void;
  onCancel: () => void;
  dict: Dict["broadcasts"];
}

type Stage = "compose" | "confirm" | "sending";

export default function BroadcastComposer({
  flows,
  onSent,
  onCancel,
  dict: b,
}: Props) {
  const [message, setMessage] = useState("");
  const [flowId, setFlowId] = useState<string>("");
  const [stage, setStage] = useState<Stage>("compose");
  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [audience, setAudience] = useState(0);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  /** Creates the broadcast as a DRAFT and reports the reach. Sends nothing. */
  async function preview() {
    setError(null);

    const response = await fetch("/api/broadcasts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, flowId: flowId || null }),
    });
    const data = await response.json();

    if (response.status === 422 && data.audience !== undefined) {
      setError(t(b.tooLarge, { count: data.audience, limit: data.limit }));
      return;
    }
    if (!response.ok || !data.success) {
      setError(b.failed);
      return;
    }
    if (data.audience === 0) {
      setError(b.noAudience);
      return;
    }

    setBroadcastId(data.broadcast.id);
    setAudience(data.audience);
    setStage("confirm");
  }

  async function send() {
    if (!broadcastId) return;
    setStage("sending");
    setError(null);

    const response = await fetch(`/api/broadcasts/${broadcastId}/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        confirm: b.confirmWord,
        // Echoed from the preview: if the audience moved, the server aborts
        // rather than sending to a list this screen never showed.
        expectedRecipients: audience,
      }),
    });
    const data = await response.json();

    if (response.status === 409) {
      setError(b.audienceChanged);
      setStage("confirm");
      return;
    }
    if (!response.ok || !data.success) {
      setError(b.failed);
      setStage("confirm");
      return;
    }

    onSent();
  }

  const canSend = typed.trim() === b.confirmWord;

  return (
    <section className="panel space-y-4 rounded-lg p-4">
      {error && (
        <p role="alert" className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}

      {stage === "compose" ? (
        <>
          <label className="block">
            <span className="text-xs font-medium text-muted">{b.messageLabel}</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={b.messagePlaceholder}
              rows={5}
              maxLength={4000}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-accent/40 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-muted">{b.audienceLabel}</span>
            <select
              value={flowId}
              onChange={(event) => setFlowId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent/40 focus:outline-none"
            >
              <option value="">{b.audienceAll}</option>
              {flows.map((flow) => (
                <option key={flow.id} value={flow.id}>
                  {flow.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void preview()}
              disabled={message.trim().length === 0}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {b.previewBtn}
            </button>
            <button
              onClick={onCancel}
              className="text-sm font-medium text-muted hover:text-foreground"
            >
              {b.cancelBtn}
            </button>
          </div>
        </>
      ) : (
        <>
          <div>
            <p className="text-sm font-semibold text-foreground">{b.confirmTitle}</p>
            <p className="mt-1 text-sm text-muted">
              {t(b.confirmBody, { count: audience })}
            </p>
            <p className="mt-1 text-xs font-medium text-error">{b.irreversible}</p>
          </div>

          <blockquote className="rounded-md border border-border bg-surface px-3 py-2 text-sm whitespace-pre-wrap text-foreground">
            {message}
          </blockquote>

          <label className="block">
            <span className="text-xs font-medium text-muted">
              {t(b.confirmTypeLabel, { word: b.confirmWord })}
            </span>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent/40 focus:outline-none"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void send()}
              disabled={!canSend || stage === "sending"}
              className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            >
              {stage === "sending"
                ? b.sending
                : `${b.sendBtn} — ${t(b.reachLabel, { count: audience })}`}
            </button>
            <button
              onClick={onCancel}
              className="text-sm font-medium text-muted hover:text-foreground"
            >
              {b.cancelBtn}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
