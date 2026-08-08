"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { t } from "@/components/dictionary-provider";
import { chainFrom, pruneCrumbs, type Crumb } from "@/lib/telegram/flow-chain";
import type { FlowStep } from "@/lib/telegram/flow-types";
import { validateFlow } from "@/lib/telegram/flow-validation";
import type { Dict } from "@/lib/i18n/types";
import FlowPreview from "@/components/flows/flow-preview";

interface Props {
  flowId: string;
  initialName: string;
  initialSteps: FlowStep[];
  initialActive: boolean;
  lang: string;
  dict: Dict["flowEditor"];
}

let stepCounter = 0;
function newStepId() {
  stepCounter += 1;
  return `step_${Date.now().toString(36)}_${stepCounter}`;
}

export default function FlowEditor({
  flowId,
  initialName,
  initialSteps,
  initialActive,
  lang,
  dict: e,
}: Props) {
  const [name, setName] = useState(initialName);
  const [steps, setSteps] = useState<FlowStep[]>(initialSteps);
  const [isActive, setIsActive] = useState(initialActive);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [testStatus, setTestStatus] = useState<
    "idle" | "sending" | "sent" | "failed" | "needs-link"
  >("idle");
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  // D6: below the tablet breakpoint Edit and Preview are tabs, not columns —
  // a stacked preview falls below the fold and stops being a destination.
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  // D7: the drill-in slide. Skipped entirely under prefers-reduced-motion.
  const [entering, setEntering] = useState(false);

  const breadcrumbRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState("");

  const validation = useMemo(() => validateFlow(steps), [steps]);

  // A step deleted out from under the trail must not strand the editor on a
  // level that no longer exists.
  const safeCrumbs = useMemo(() => pruneCrumbs(steps, crumbs), [steps, crumbs]);
  const levelStartId = safeCrumbs.at(-1)?.stepId ?? steps[0]?.id ?? null;
  const level = useMemo(() => chainFrom(steps, levelStartId), [steps, levelStartId]);

  function updateStep(id: string, patch: Partial<FlowStep>) {
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, ...patch } : step))
    );
  }

  function deleteStep(id: string) {
    setSteps((current) => {
      const remaining = current.filter((step) => step.id !== id);
      // Anything pointing at the deleted step now points at nothing, which
      // validation would report as a broken link. Repointing to "ends here" is
      // the honest default: the path really does stop.
      return remaining.map((step) => ({
        ...step,
        nextStepId: step.nextStepId === id ? null : step.nextStepId,
        options: step.options?.map((option) =>
          option.nextStepId === id ? { ...option, nextStepId: null } : option
        ),
      }));
    });
  }

  /** Insert a step directly after `afterId` in this level's chain. */
  function addStepAfter(afterId: string) {
    const id = newStepId();
    setSteps((current) => {
      const target = current.find((step) => step.id === afterId);
      const inserted: FlowStep = {
        id,
        message: "",
        nextStepId: target?.nextStepId ?? null,
      };
      return [
        ...current.map((step) =>
          step.id === afterId ? { ...step, nextStepId: id } : step
        ),
        inserted,
      ];
    });
  }

  function addOption(stepId: string) {
    setSteps((current) =>
      current.map((step) =>
        step.id === stepId
          ? {
              ...step,
              options: [...(step.options ?? []), { label: "", nextStepId: null }],
            }
          : step
      )
    );
  }

  function updateOption(
    stepId: string,
    index: number,
    patch: Partial<{ label: string; nextStepId: string | null }>
  ) {
    setSteps((current) =>
      current.map((step) =>
        step.id === stepId
          ? {
              ...step,
              options: step.options?.map((option, i) =>
                i === index ? { ...option, ...patch } : option
              ),
            }
          : step
      )
    );
  }

  function removeOption(stepId: string, index: number) {
    setSteps((current) =>
      current.map((step) =>
        step.id === stepId
          ? { ...step, options: step.options?.filter((_, i) => i !== index) }
          : step
      )
    );
  }

  /** Drill into a branch: new level, new crumb, focus and announce (D7). */
  function openBranch(targetId: string | null, label: string) {
    if (!targetId) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    setCrumbs((current) => [...current, { stepId: targetId, label }]);
    setAnnouncement(t(e.enteredBranch, { label }));

    if (!reduced) {
      setEntering(true);
      window.setTimeout(() => setEntering(false), 200);
    }

    // Focus moves to the breadcrumb so a keyboard or screen-reader user lands
    // where the context changed, not back at the top of a new list.
    window.setTimeout(() => breadcrumbRef.current?.focus(), 0);
  }

  // Slices the pruned trail, not the raw one: a deleted step must not come back
  // into the breadcrumb by navigating up and back down.
  function goToCrumb(index: number) {
    setCrumbs(safeCrumbs.slice(0, index));
  }

  /**
   * D4: a real send through the real bot, not a simulation. Needs the builder's
   * own Telegram bound first — 409 is that case, and it is a step rather than
   * a failure.
   */
  async function testSend() {
    setTestStatus("sending");
    setLinkUrl(null);

    try {
      const response = await fetch(`/api/flows/${flowId}/test-send`, {
        method: "POST",
      });
      const data = await response.json();

      if (response.status === 409 && data.needsLink) {
        const linkResponse = await fetch("/api/telegram/link", { method: "POST" });
        const linkData = await linkResponse.json();
        setLinkUrl(linkData.success ? linkData.url : null);
        setTestStatus("needs-link");
        return;
      }

      setTestStatus(response.ok && data.success ? "sent" : "failed");
    } catch {
      setTestStatus("failed");
    }
  }

  async function save() {
    setStatus("saving");
    try {
      const response = await fetch(`/api/flows/${flowId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, steps, isActive }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error("failed");
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("failed");
    }
  }

  const otherSteps = steps.filter((step) => !level.some((s) => s.id === step.id));

  return (
    <div className="space-y-5">
      {/* Live region for the drill-in announcement (D7). */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/${lang}/flows`}
            className="text-xs font-medium text-muted hover:text-foreground"
          >
            ← {e.backToFlows}
          </Link>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full truncate bg-transparent text-2xl font-extrabold text-foreground focus:outline-none"
          />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-muted">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="accent-accent"
            />
            {e.activeLabel}
          </label>

          {/* D4 — disabled while the flow is invalid: watching a broken funnel
              half-work on your own phone is not information. */}
          <button
            onClick={() => void testSend()}
            disabled={testStatus === "sending" || !validation.valid}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            {testStatus === "sending"
              ? e.testSending
              : testStatus === "sent"
                ? e.testSent
                : testStatus === "failed"
                  ? e.testFailed
                  : e.testSend}
          </button>

          <button
            onClick={() => void save()}
            disabled={status === "saving" || !validation.valid}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {status === "saving"
              ? e.saving
              : status === "saved"
                ? e.saved
                : status === "failed"
                  ? e.saveFailed
                  : e.save}
          </button>
        </div>
      </div>

      {testStatus === "needs-link" && (
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <p className="text-xs text-foreground">{e.testNeedsLink}</p>
          {linkUrl && (
            <>
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                {e.testLinkBtn}
              </a>
              <p className="mt-1 text-xs text-subtle">{e.testLinkHint}</p>
            </>
          )}
        </div>
      )}

      {/* D5 summary. Errors block the save button above. */}
      <div className="space-y-2">
        {validation.errors.length > 0 && (
          <div className="rounded-md border border-error/30 bg-error/5 px-3 py-2">
            <p className="text-xs font-semibold text-error">
              {t(e.errorsTitle, { count: validation.errors.length })}
            </p>
            <ul className="mt-1 space-y-0.5">
              {validation.errors.map((issue, index) => (
                <li key={`${issue.code}-${index}`} className="text-xs text-error/90">
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {validation.warnings.length > 0 && (
          <div className="rounded-md border border-border bg-surface px-3 py-2">
            <p className="text-xs font-semibold text-muted">
              {t(e.warningsTitle, { count: validation.warnings.length })}
            </p>
            <ul className="mt-1 space-y-0.5">
              {validation.warnings.map((issue, index) => (
                <li key={`${issue.code}-${index}`} className="text-xs text-muted">
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* D6: tabs below the tablet breakpoint, columns above. */}
      <div className="flex gap-1 rounded-lg bg-surface p-1 lg:hidden">
        {(["edit", "preview"] as const).map((value) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm transition-colors ${
              tab === value
                ? "bg-background font-medium text-foreground ring-1 ring-accent/40"
                : "text-muted"
            }`}
          >
            {value === "edit" ? e.tabEdit : e.tabPreview}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className={tab === "edit" ? "" : "hidden lg:block"}>
          {/* Breadcrumb — the only thing telling you how deep you are (D1). */}
          <div
            ref={breadcrumbRef}
            tabIndex={-1}
            className="mb-3 flex flex-wrap items-center gap-1 text-xs focus:outline-none"
          >
            <button
              onClick={() => goToCrumb(0)}
              className={
                safeCrumbs.length === 0
                  ? "font-semibold text-foreground"
                  : "text-muted hover:text-foreground"
              }
            >
              {e.rootCrumb}
            </button>
            {safeCrumbs.map((crumb, index) => (
              <span key={`${crumb.stepId}-${index}`} className="flex items-center gap-1">
                <span className="text-subtle">/</span>
                <button
                  onClick={() => goToCrumb(index + 1)}
                  className={
                    index === safeCrumbs.length - 1
                      ? "font-semibold text-foreground"
                      : "text-muted hover:text-foreground"
                  }
                >
                  {crumb.label ?? e.rootCrumb}
                </button>
              </span>
            ))}
          </div>

          <div
            className={`space-y-3 transition-transform duration-200 ${
              entering ? "translate-x-3 opacity-0" : "translate-x-0 opacity-100"
            }`}
          >
            {level.map((step, index) => (
              <article key={step.id} className="panel rounded-lg p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                    {t(e.stepBadge, { index: index + 1 })}
                  </span>
                  <button
                    onClick={() => deleteStep(step.id)}
                    className="text-xs font-medium text-muted hover:text-error"
                  >
                    {e.deleteStep}
                  </button>
                </div>

                <label className="block text-xs font-medium text-muted">
                  {e.messageLabel}
                </label>
                <textarea
                  value={step.message}
                  onChange={(event) =>
                    updateStep(step.id, { message: event.target.value })
                  }
                  placeholder={e.messagePlaceholder}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-accent/40 focus:outline-none"
                />

                <label className="mt-3 block text-xs font-medium text-muted">
                  {e.saveAnswerLabel}
                </label>
                <input
                  value={step.saveAnswerAs ?? ""}
                  onChange={(event) =>
                    updateStep(step.id, {
                      saveAnswerAs: event.target.value || undefined,
                    })
                  }
                  placeholder={e.saveAnswerPlaceholder}
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-accent/40 focus:outline-none"
                />

                <div className="mt-3">
                  <p className="text-xs font-medium text-muted">{e.optionsLabel}</p>
                  <div className="mt-1 space-y-2">
                    {step.options?.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex flex-wrap items-center gap-2">
                        <input
                          value={option.label}
                          onChange={(event) =>
                            updateOption(step.id, optionIndex, {
                              label: event.target.value,
                            })
                          }
                          placeholder={e.optionLabelPlaceholder}
                          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground placeholder:text-subtle focus:border-accent/40 focus:outline-none"
                        />
                        <select
                          value={option.nextStepId ?? ""}
                          onChange={(event) =>
                            updateOption(step.id, optionIndex, {
                              nextStepId: event.target.value || null,
                            })
                          }
                          className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus:border-accent/40 focus:outline-none"
                        >
                          <option value="">{e.optionEnds}</option>
                          {otherSteps.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.message.slice(0, 30) || candidate.id}
                            </option>
                          ))}
                        </select>
                        {option.nextStepId && (
                          <button
                            onClick={() => openBranch(option.nextStepId, option.label)}
                            className="rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted hover:text-foreground"
                          >
                            {e.openBranch} →
                          </button>
                        )}
                        <button
                          onClick={() => removeOption(step.id, optionIndex)}
                          aria-label={`${e.deleteOption}: ${option.label}`}
                          className="text-xs text-muted hover:text-error"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={() => addOption(step.id)}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      + {e.addOption}
                    </button>
                    {!step.options?.length && (
                      <button
                        onClick={() => addStepAfter(step.id)}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        + {e.addStep}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* D8: Telegram-styled preview. */}
        <aside className={tab === "preview" ? "" : "hidden lg:block"}>
          <FlowPreview steps={level} title={e.previewTitle} emptyLabel={e.previewEmpty} />
        </aside>
      </div>
    </div>
  );
}
