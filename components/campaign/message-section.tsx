"use client";

import { Section } from "./primitives";

interface MessageSectionProps {
  dmMessage: string;
  onDmMessageChange: (msg: string) => void;
  linkOpen: boolean;
  onLinkOpen: () => void;
  trackedDestinationUrl: string;
  onTrackedUrlChange: (url: string) => void;
  onTrackedUrlBlur: () => void;
  linkButtonLabel: string;
  onLinkButtonLabelChange: (label: string) => void;
  secondLinkOpen: boolean;
  onSecondLinkOpen: () => void;
  secondaryDestinationUrl: string;
  onSecondaryUrlChange: (url: string) => void;
  secondaryButtonLabel: string;
  onSecondaryButtonLabelChange: (label: string) => void;
  t: {
    sectionAndTheyReceive: string;
    dmWithLinkLabel: string;
    dmPlaceholder: string;
    addLink: string;
    addSecondLink: string;
    linkButtonPlaceholder: string;
    secondButtonPlaceholder: string;
    tokenHint: string;
  };
}

export default function MessageSection({
  dmMessage,
  onDmMessageChange,
  linkOpen,
  onLinkOpen,
  trackedDestinationUrl,
  onTrackedUrlChange,
  onTrackedUrlBlur,
  linkButtonLabel,
  onLinkButtonLabelChange,
  secondLinkOpen,
  onSecondLinkOpen,
  secondaryDestinationUrl,
  onSecondaryUrlChange,
  secondaryButtonLabel,
  onSecondaryButtonLabelChange,
  t,
}: MessageSectionProps) {
  return (
    <Section title={t.sectionAndTheyReceive}>
      <div className="rounded-lg border border-border p-3 space-y-2">
        <span className="text-sm text-foreground">{t.dmWithLinkLabel}</span>
        <textarea
          value={dmMessage}
          onChange={(e) => onDmMessageChange(e.target.value)}
          placeholder={t.dmPlaceholder}
          rows={3}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent/40 focus:outline-none resize-none"
          maxLength={1000}
        />
        {linkOpen ? (
          <div className="space-y-2">
            <input
              value={trackedDestinationUrl}
              onChange={(e) => onTrackedUrlChange(e.target.value)}
              onBlur={onTrackedUrlBlur}
              placeholder="https://yourlink.com/offer"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent/40 focus:outline-none"
            />
            <input
              value={linkButtonLabel}
              onChange={(e) => onLinkButtonLabelChange(e.target.value)}
              placeholder={t.linkButtonPlaceholder}
              maxLength={20}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent/40 focus:outline-none"
            />
            {secondLinkOpen ? (
              <div className="space-y-2 border-t border-border pt-2">
                <input
                  value={secondaryDestinationUrl}
                  onChange={(e) => onSecondaryUrlChange(e.target.value)}
                  placeholder="https://yourlink.com/second"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent/40 focus:outline-none"
                />
                <input
                  value={secondaryButtonLabel}
                  onChange={(e) => onSecondaryButtonLabelChange(e.target.value)}
                  placeholder={t.secondButtonPlaceholder}
                  maxLength={20}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent/40 focus:outline-none"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={onSecondLinkOpen}
                className="w-full rounded-lg border border-border py-2 text-sm text-muted hover:text-foreground"
              >
                {t.addSecondLink}
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onLinkOpen}
            className="w-full rounded-lg border border-border py-2 text-sm text-muted hover:text-foreground"
          >
            {t.addLink}
          </button>
        )}
        <p className="text-xs text-muted">{t.tokenHint}</p>
      </div>
    </Section>
  );
}
