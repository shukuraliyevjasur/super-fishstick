"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { t } from "@/components/dictionary-provider";
import type { FlowSummary } from "@/lib/data/flows";
import type { Dict } from "@/lib/i18n/types";

export interface TemplateOption {
  id: string;
  name: string;
  description: string;
  stepCount: number;
}

interface Props {
  initialFlows: FlowSummary[];
  templates: TemplateOption[];
  lang: string;
  dict: Dict["flows"];
}

export default function FlowList({
  initialFlows,
  templates,
  lang,
  dict: f,
}: Props) {
  const router = useRouter();

  const [flows, setFlows] = useState(initialFlows);
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createFlow(template: TemplateOption | null) {
    setCreating(template?.id ?? "blank");
    setError(null);

    try {
      const response = await fetch("/api/flows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          template
            ? { name: template.name, templateId: template.id }
            : // A blank flow still needs one step: an empty flow fails
              // validation, and landing in an editor that already says
              // "invalid" is a bad first impression.
              {
                name: f.startBlank,
                steps: [{ id: "start", message: "", nextStepId: null }],
              }
        ),
      });

      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? "failed");

      router.push(`/${lang}/flows/${data.flow.id}`);
    } catch {
      setError(f.createFailed);
      setCreating(null);
    }
  }

  async function deleteFlow(id: string) {
    if (!window.confirm(f.deleteConfirm)) return;

    const response = await fetch(`/api/flows/${id}`, { method: "DELETE" });
    if (response.ok) setFlows((current) => current.filter((flow) => flow.id !== id));
  }

  const showPicker = picking || flows.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">{f.title}</h1>
          <p className="mt-1 text-sm text-muted">{f.subtitle}</p>
        </div>

        {flows.length > 0 && !picking && (
          <button
            onClick={() => setPicking(true)}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {f.newBtn}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}

      {/* D3: the empty state is a template picker, not a blank page. It shows
          the model rather than explaining it, and doubles as onboarding. */}
      {showPicker ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {flows.length === 0 ? f.emptyTitle : f.templatePickerTitle}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {flows.length === 0 ? f.emptyDesc : f.templatePickerDesc}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => void createFlow(template)}
                disabled={creating !== null}
                className="panel rounded-lg p-4 text-left transition-all hover:border-border-hover disabled:opacity-60"
              >
                <p className="text-sm font-semibold text-foreground">{template.name}</p>
                <p className="mt-1 text-xs text-muted">{template.description}</p>
                <p className="mt-3 text-xs text-subtle">
                  {t(f.stepCount, { count: template.stepCount })}
                </p>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void createFlow(null)}
              disabled={creating !== null}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-60"
            >
              {f.startBlank}
            </button>

            {flows.length > 0 && (
              <button
                onClick={() => setPicking(false)}
                className="text-sm font-medium text-muted hover:text-foreground"
              >
                {f.cancelBtn}
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          <p className="text-xs text-subtle">
            {t(f.countLabel, { count: flows.length })}
          </p>

          <ul className="space-y-2">
            {flows.map((flow) => (
              <li
                key={flow.id}
                className="panel flex items-center gap-4 rounded-md p-4 transition-all hover:border-border-hover"
              >
                <Link href={`/${lang}/flows/${flow.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {flow.name}
                    </span>

                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        flow.isActive
                          ? "bg-accent/10 text-accent"
                          : "border border-border text-muted"
                      }`}
                    >
                      {flow.isActive ? f.statusActive : f.statusPaused}
                    </span>

                    {/* D5 surfaced in the list — the screen you are not looking
                        at is where a broken funnel hides. */}
                    {!flow.valid && (
                      <span className="shrink-0 rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error">
                        {t(f.hasErrors, { count: flow.errorCount })}
                      </span>
                    )}
                    {flow.valid && flow.warningCount > 0 && (
                      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted">
                        {t(f.hasWarnings, { count: flow.warningCount })}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-muted">
                    {t(f.stepCount, { count: flow.stepCount })}
                    {" · "}
                    {t(f.conversationCount, { count: flow.conversationCount })}
                  </p>
                </Link>

                <button
                  onClick={() => void deleteFlow(flow.id)}
                  aria-label={`${f.deleteBtn}: ${flow.name}`}
                  className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-error/40 hover:bg-error/5 hover:text-error"
                >
                  {f.deleteBtn}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
