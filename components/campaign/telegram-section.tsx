"use client";

/**
 * Telegram destination (T10).
 *
 * Opt-in and collapsed by default: a customer who does not use Telegram should
 * not have to read past it. That is the "invisible to non-Telegram customers"
 * condition E1′ was accepted on.
 */

import { Section, Toggle } from "@/components/campaign/primitives";
import type { Dict } from "@/lib/i18n/types";

export interface FlowOptionSummary {
  id: string;
  name: string;
  /** A flow with validation errors must not be silently selectable. */
  valid: boolean;
}

interface Props {
  enabled: boolean;
  onToggle: () => void;
  flows: FlowOptionSummary[];
  selectedFlowId: string | null;
  onFlowChange: (flowId: string | null) => void;
  /** Null until the campaign is saved, or when no bot username is configured. */
  deepLink: string | null;
  t: Dict["campaignBuilder"];
}

export default function TelegramSection({
  enabled,
  onToggle,
  flows,
  selectedFlowId,
  onFlowChange,
  deepLink,
  t,
}: Props) {
  return (
    <Section title={t.telegramTitle}>
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
        <div className="min-w-0">
          <p className="text-sm text-foreground">{t.telegramToggleLabel}</p>
          <p className="mt-0.5 text-xs text-muted">{t.telegramToggleHint}</p>
        </div>
        <Toggle on={enabled} onToggle={onToggle} />
      </div>

      {enabled && (
        <div className="space-y-3">
          {flows.length === 0 ? (
            <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
              {t.telegramNoFlows}
            </p>
          ) : (
            <label className="block">
              <span className="text-xs font-medium text-muted">
                {t.telegramFlowLabel}
              </span>
              <select
                value={selectedFlowId ?? ""}
                onChange={(event) => onFlowChange(event.target.value || null)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent/40 focus:outline-none"
              >
                <option value="">{t.telegramNoFlowSelected}</option>
                {flows.map((flow) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.valid ? flow.name : `${flow.name} — ${t.telegramFlowBroken}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* The link is the whole point of the feature, so it is shown rather
              than described. Absent before the campaign is saved, because the
              payload is the campaign's own id. */}
          {deepLink ? (
            <div>
              <span className="text-xs font-medium text-muted">
                {t.telegramLinkLabel}
              </span>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground">
                  {deepLink}
                </code>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(deepLink)}
                  className="shrink-0 rounded-md border border-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
                >
                  {t.telegramCopy}
                </button>
              </div>
              <p className="mt-1 text-xs text-subtle">{t.telegramLinkHint}</p>
            </div>
          ) : (
            <p className="text-xs text-subtle">{t.telegramLinkPending}</p>
          )}
        </div>
      )}
    </Section>
  );
}
