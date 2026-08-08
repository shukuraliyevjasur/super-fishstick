"use client";

import { Section, Radio, Toggle } from "./primitives";

type MatchMode = "specific" | "any";

interface MatchSectionProps {
  matchMode: MatchMode;
  onMatchModeChange: (mode: MatchMode) => void;
  keywordText: string;
  onKeywordTextChange: (text: string) => void;
  publicReplyEnabled: boolean;
  onPublicReplyToggle: () => void;
  publicReplyMessages: string[];
  onPublicReplyMessagesChange: (msgs: string[]) => void;
  t: {
    sectionAnd: string;
    matchSpecific: string;
    keywordPlaceholder: string;
    keywordHint: string;
    matchAny: string;
    publicReplyLabel: string;
    publicReplyPlaceholder: string;
    addReply: string;
    replyRotateHint: string;
  };
}

export default function MatchSection({
  matchMode,
  onMatchModeChange,
  keywordText,
  onKeywordTextChange,
  publicReplyEnabled,
  onPublicReplyToggle,
  publicReplyMessages,
  onPublicReplyMessagesChange,
  t,
}: MatchSectionProps) {
  return (
    <Section title={t.sectionAnd}>
      <Radio
        checked={matchMode === "specific"}
        onSelect={() => onMatchModeChange("specific")}
      >
        {t.matchSpecific}
      </Radio>
      {matchMode === "specific" && (
        <div className="space-y-1">
          <input
            value={keywordText}
            onChange={(e) => onKeywordTextChange(e.target.value)}
            placeholder={t.keywordPlaceholder}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent/40 focus:outline-none"
          />
          <p className="text-xs text-muted">{t.keywordHint}</p>
        </div>
      )}
      <Radio
        checked={matchMode === "any"}
        onSelect={() => onMatchModeChange("any")}
      >
        {t.matchAny}
      </Radio>
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
        <span className="text-sm text-foreground">
          {t.publicReplyLabel}
        </span>
        <Toggle on={publicReplyEnabled} onToggle={onPublicReplyToggle} />
      </div>
      {publicReplyEnabled && (
        <div className="space-y-2">
          {publicReplyMessages.map((msg, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={msg}
                onChange={(e) =>
                  onPublicReplyMessagesChange(
                    publicReplyMessages.map((m, idx) => (idx === i ? e.target.value : m))
                  )
                }
                placeholder={t.publicReplyPlaceholder}
                maxLength={1000}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent/40 focus:outline-none"
              />
              {publicReplyMessages.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    onPublicReplyMessagesChange(
                      publicReplyMessages.filter((_, idx) => idx !== i)
                    )
                  }
                  className="shrink-0 px-2 text-muted hover:text-error"
                  aria-label="Remove reply"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {publicReplyMessages.length < 10 && (
            <button
              type="button"
              onClick={() =>
                onPublicReplyMessagesChange([...publicReplyMessages, ""])
              }
              className="text-xs font-medium text-accent hover:underline"
            >
              {t.addReply}
            </button>
          )}
          <p className="text-xs text-muted">{t.replyRotateHint}</p>
        </div>
      )}
    </Section>
  );
}
