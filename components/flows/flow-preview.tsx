"use client";

/**
 * Telegram-styled flow preview (D8).
 *
 * ─── DESIGN SYSTEM EXCEPTION — do not "fix" this (backlog T-3) ───────────────
 * The colours and radii below are raw values on purpose. This panel imitates
 * the Telegram chat window, so it answers to Telegram's appearance rather than
 * to the closed token scales in `app/globals.css`. Converting it to tokens
 * makes it stop reading as Telegram, which is the entire point of a preview.
 *
 * Exactly the same precedent already exists and is recorded in the handbook's
 * design-system section: `components/campaign-preview.tsx` uses raw dark values
 * to imitate Instagram, with the same instruction attached.
 *
 * Everything *outside* the chat window — the panel border, the heading — uses
 * normal tokens. The exception stops at the edge of the phone.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { FlowStep } from "@/lib/telegram/flow-types";

interface Props {
  /** The steps at the level currently open in the editor. */
  steps: FlowStep[];
  title: string;
  emptyLabel: string;
}

/** Telegram renders {username} with the recipient's first name. */
const SAMPLE_NAME = "Aziz";

function renderPreviewText(message: string) {
  return message
    .replace(/\{username\}/gi, SAMPLE_NAME)
    .replace(/\{link\}/gi, "https://replie.uz/r/abc123");
}

export default function FlowPreview({ steps, title, emptyLabel }: Props) {
  const visible = steps.filter((step) => step.message.trim().length > 0);

  return (
    <div className="lg:sticky lg:top-4">
      <p className="mb-2 text-xs font-medium text-muted">{title}</p>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="bg-[#17212b] px-4 py-2.5">
          <p className="text-[13px] font-semibold text-white">replie_bot</p>
          <p className="text-[11px] text-[#7d8e9a]">bot</p>
        </div>

        <div className="min-h-[280px] space-y-2 bg-[#0e1621] px-3 py-3">
          {visible.length === 0 ? (
            <p className="pt-8 text-center text-[12px] text-[#7d8e9a]">{emptyLabel}</p>
          ) : (
            visible.map((step) => (
              <div key={step.id} className="space-y-1.5">
                <div className="max-w-[85%] rounded-[12px] rounded-bl-[4px] bg-[#182533] px-3 py-2">
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-snug text-[#e9edf0]">
                    {renderPreviewText(step.message)}
                  </p>
                </div>

                {step.options?.length ? (
                  <div className="space-y-1">
                    {step.options.map((option, index) => (
                      <div
                        key={index}
                        className="rounded-[8px] bg-[#2b5278] px-3 py-1.5 text-center text-[12px] font-medium text-white"
                      >
                        {option.label || "—"}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
