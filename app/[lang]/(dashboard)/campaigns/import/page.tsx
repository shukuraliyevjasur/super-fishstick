"use client";

/**
 * Import Campaigns Page
 *
 * Paste a CSV of everything except the post. Each row is queued and opened in
 * the campaign builder prefilled and editable, one at a time, so you review
 * each campaign and pick its reel before saving.
 */

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import { parseCsv } from "@/lib/utils/csv";
import { IMPORT_QUEUE_KEY, IMPORT_ACCOUNT_KEY } from "@/lib/import-queue";
import { useDict, t } from "@/components/dictionary-provider";

const SAMPLE = `keywords,dm_message,public_reply,tracked_url,opening_dm,opening_dm_button
"yc","here it is: {link}","sent. check dms","https://events.ycombinator.com/startup-school-2026","hey! click below for the referral","send link"
"LINK,SHOP","grab it here: {link}","dmed u",,,`;

export default function ImportCampaignsPage() {
  const dict = useDict();
  const d = dict.importCampaigns;
  const router = useRouter();
  const params = useParams();
  const lang = (params.lang as string) || "uz";
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [csv, setCsv] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success) {
          const next = payload.data.instagramAccounts ?? [];
          setAccounts(next);
          setSelectedAccountId(next[0]?.id ?? "");
        }
      })
      .catch(() => setAccounts([]));
  }, []);

  function startImport() {
    setError(null);
    const parsed = parseCsv(csv);
    if (parsed.length === 0) {
      setError(d.errNoCsv);
      return;
    }

    const rows = [];
    for (let i = 0; i < parsed.length; i++) {
      const r = parsed[i];
      const keywords = (r.keywords ?? "")
        .split(/[,;]/)
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 10);
      const dmMessage = (r.dm_message ?? r.message ?? "").trim();
      if (keywords.length === 0 || !dmMessage) {
        setError(t(d.errRowMissing, { row: i + 1 }));
        return;
      }
      rows.push({
        name: (r.name ?? "").trim(),
        keywords,
        dmMessage,
        publicReply: (r.public_reply ?? "").trim(),
        trackedUrl: (r.tracked_url ?? "").trim(),
        openingDmMessage: (r.opening_dm ?? "").trim(),
        openingDmButtonLabel: (r.opening_dm_button ?? "").trim(),
      });
    }

    try {
      window.localStorage.setItem(IMPORT_QUEUE_KEY, JSON.stringify(rows));
      if (selectedAccountId) {
        window.localStorage.setItem(IMPORT_ACCOUNT_KEY, selectedAccountId);
      }
    } catch {
      setError(d.errStorage);
      return;
    }
    router.push(`/${lang}/campaigns/new`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold">{d.title}</h1>
        {/* The column names are CSV header identifiers, not UI copy — they stay
            untranslated and the prose around them is what moves. */}
        <p className="text-sm text-muted mt-1">
          {d.descIntro} {d.descRequired}{" "}
          <code className="text-accent">keywords</code>,{" "}
          <code className="text-accent">dm_message</code>. {d.descOptional}{" "}
          <code className="text-accent">name</code>,{" "}
          <code className="text-accent">public_reply</code>,{" "}
          <code className="text-accent">tracked_url</code>,{" "}
          <code className="text-accent">opening_dm</code>,{" "}
          <code className="text-accent">opening_dm_button</code>.{" "}
          {d.descKeywords} {d.descLink}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-error/10 border border-error/20 text-error text-sm">
          {error}
        </div>
      )}

      {accounts.length > 1 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            {d.accountLabel}
          </label>
          <AccountSelect
            accounts={accounts}
            value={selectedAccountId}
            onChange={setSelectedAccountId}
            includeAll={false}
            label={d.accountShort}
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">CSV</label>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={SAMPLE}
          rows={10}
          className="w-full px-4 py-3 rounded-md bg-surface border border-border text-sm font-mono text-foreground placeholder:text-muted focus:border-accent/40 focus:outline-none resize-y"
        />
        <button
          type="button"
          onClick={() => setCsv(SAMPLE)}
          className="text-xs text-muted hover:text-foreground"
        >
          {d.fillSample}
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={startImport}
          className="px-5 py-2 rounded-md bg-accent text-sm font-medium text-white hover:bg-accent-hover"
        >
          {d.submit}
        </button>
        <button
          onClick={() => router.push(`/${lang}/campaigns`)}
          className="px-5 py-2 rounded-md text-sm text-muted hover:text-foreground border border-border"
        >
          {d.cancel}
        </button>
      </div>
    </div>
  );
}
