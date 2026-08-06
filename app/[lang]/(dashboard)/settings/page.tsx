"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import type { AccountOption } from "@/components/account-select";
import { useDict, t } from "@/components/dictionary-provider";
import { intlLocale } from "@/lib/i18n/format";

interface SettingsData {
  workspace: {
    name: string;
    dmsSentThisPeriod: number;
  };
  instagramAccount: {
    id: string;
    username: string;
    instagramId: string;
    tokenExpiresAt: string | null;
    webhookSubscribed: boolean;
  } | null;
  instagramAccounts: Array<
    AccountOption & {
      tokenExpiresAt: string | null;
      webhookSubscribed: boolean;
    }
  >;
  plan: string;
  dmQuota: { used: number; limit: number | null } | null;
  activeAutomations: number;
  totalAutomations: number;
  clicksThisMonth: number;
  contactsCount: number;
}

interface WorkspaceMembersData {
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER";
  members: Array<{
    id: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    createdAt: string;
    user: {
      id: string;
      email: string | null;
      name: string | null;
    };
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    inviteUrl: string;
    expiresAt: string;
  }>;
}

export default function SettingsPage() {
  const dict = useDict();
  const d = dict.settings;
  const searchParams = useSearchParams();
  const params = useParams();
  const lang = (params.lang as string) || "uz";
  const [data, setData] = useState<SettingsData | null>(null);
  const [membersData, setMembersData] = useState<WorkspaceMembersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const igParam = searchParams.get("instagram");
  const connectedParam = searchParams.get("connected");

  let bannerMessage: string | null = null;
  let bannerKind: "success" | "error" = "error";
  if (!bannerDismissed) {
    if (connectedParam === "true") {
      bannerMessage = d.igConnected;
      bannerKind = "success";
    } else if (igParam === "denied") {
      bannerMessage = d.igErrDenied;
    } else if (igParam === "invalid") {
      bannerMessage = d.igErrInvalid;
    } else if (igParam === "already_connected") {
      bannerMessage = d.igErrAlreadyConnected;
    } else if (igParam === "failed") {
      bannerMessage = d.igErrFailed;
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then((res) => res.json()),
      fetch("/api/workspace/members").then((res) => res.json()),
    ])
      .then(([statsPayload, membersPayload]) => {
        if (statsPayload.success) setData(statsPayload.data);
        if (membersPayload.success) setMembersData(membersPayload.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function refreshMembers() {
    const res = await fetch("/api/workspace/members");
    const payload = await res.json();
    if (payload.success) setMembersData(payload.data);
  }

  async function disconnectInstagram(instagramAccountId: string) {
    if (!confirm(d.disconnectConfirm)) {
      return;
    }
    setBusy(`disconnect:${instagramAccountId}`);
    await fetch("/api/instagram/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instagramAccountId }),
    });
    window.location.reload();
  }

  async function inviteMember(event: React.FormEvent) {
    event.preventDefault();
    setMemberError(null);
    setBusy("invite");
    const res = await fetch("/api/workspace/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const payload = await res.json();
    if (payload.success) {
      setMembersData(payload.data);
      setInviteEmail("");
    } else {
      setMemberError(payload.error ?? d.inviteFailed);
    }
    setBusy(null);
  }

  async function removeInvitation(invitationId: string) {
    setBusy(`invite:${invitationId}`);
    await fetch("/api/workspace/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId }),
    });
    await refreshMembers();
    setBusy(null);
  }

  if (loading) {
    return <div className="panel rounded-lg p-8 h-64" />;
  }

  const accounts = data?.instagramAccounts ?? [];
  const canManageMembers =
    membersData?.currentUserRole === "OWNER" ||
    membersData?.currentUserRole === "ADMIN";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {bannerMessage && (
        <div
          className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium ${
            bannerKind === "success"
              ? "bg-success/10 text-success border border-success/20"
              : "bg-error/10 text-error border border-error/20"
          }`}
        >
          <span>{bannerMessage}</span>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Instagram Connection */}
      <section className="panel rounded-lg p-6">
        <h2 className="text-base font-semibold text-foreground mb-6">{d.igHeading}</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">{d.statusLabel}</p>
              <p className="text-xs text-muted mt-0.5">{d.statusHelp}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                accounts.length > 0
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              }`}
            >
              {accounts.length > 0 ? d.connected : d.notConnected}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">{d.accountsLabel}</p>
              <p className="text-xs text-muted mt-0.5">
                {t(d.accountsHelp, { count: accounts.length })}
              </p>
            </div>
            <span className="text-sm text-muted">
              {accounts.length > 0
                ? t(d.accountsCount, { count: accounts.length })
                : d.none}
            </span>
          </div>

          <div className="space-y-3 py-3">
            {accounts.length === 0 && (
              <p className="text-sm text-muted">{d.connectPrompt}</p>
            )}
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    @{account.username}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {d.tokenExpires}{" "}
                    {account.tokenExpiresAt
                      ? new Date(account.tokenExpiresAt).toLocaleDateString(
                          intlLocale(dict.locale)
                        )
                      : d.tokenUnknown}{" "}
                    · {account.webhookSubscribed ? d.webhookReady : d.webhookPending}
                  </p>
                </div>
                <button
                  onClick={() => disconnectInstagram(account.id)}
                  disabled={busy === `disconnect:${account.id}`}
                  className="inline-flex items-center justify-center rounded-lg border border-error/20 px-4 py-2 text-sm font-medium text-error hover:border-error/40 hover:bg-error/5 disabled:opacity-50 transition-colors"
                >
                  {busy === `disconnect:${account.id}` ? d.disconnecting : d.disconnect}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- API route, not a page: needs a full navigation so the server can 302 to Meta. */}
          <a
            href="/api/instagram/connect"
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            {accounts.length > 0 ? d.connectAnother : d.connect}
          </a>
        </div>
      </section>

      {/* Team */}
      <section className="panel rounded-lg p-6">
        <h2 className="text-base font-semibold text-foreground mb-6">{d.teamHeading}</h2>
        <div className="space-y-3">
          {membersData?.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {member.user.name ?? member.user.email ?? d.unknownMember}
                </p>
                <p className="text-xs text-muted">{member.user.email}</p>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted">
                {member.role}
              </span>
            </div>
          ))}
        </div>

        {membersData?.invitations.length ? (
          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
              {d.pendingInvites}
            </p>
            <div className="space-y-3">
              {membersData.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {invitation.email}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {invitation.role} · {invitation.inviteUrl}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard?.writeText(invitation.inviteUrl)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-border-hover hover:text-foreground transition-colors"
                    >
                      {d.copy}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeInvitation(invitation.id)}
                      disabled={busy === `invite:${invitation.id}`}
                      className="rounded-lg border border-error/20 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/5 disabled:opacity-50 transition-colors"
                    >
                      {d.cancel}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {canManageMembers && (
          <form
            onSubmit={inviteMember}
            className="mt-6 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_140px_auto]"
          >
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder={d.invitePlaceholder}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-accent transition-colors"
              required
            />
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as "ADMIN" | "MEMBER")}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent transition-colors"
            >
              {/* Values are API role codes and must stay untranslated. */}
              <option value="MEMBER">{d.roleMember}</option>
              <option value="ADMIN">{d.roleAdmin}</option>
            </select>
            <button
              type="submit"
              disabled={busy === "invite"}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {busy === "invite" ? d.sending : d.sendInvite}
            </button>
            {memberError && (
              <p className="sm:col-span-3 text-sm text-error">{memberError}</p>
            )}
          </form>
        )}
      </section>

      {/* Usage */}
      <section className="panel rounded-lg p-6">
        {/* Header: plan badge + heading + upgrade */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-foreground">{d.usageHeading}</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                data?.plan === "AGENCY"
                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                  : data?.plan === "PRO"
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : data?.plan === "STANDART"
                      ? "bg-accent/10 text-accent border border-accent/20"
                      : "bg-border text-muted border border-border-hover"
              }`}
            >
              {data?.plan === "AGENCY"
                ? dict.sidebar.planAgency
                : data?.plan === "PRO"
                  ? dict.sidebar.planPro
                  : data?.plan === "STANDART"
                    ? dict.sidebar.planStandard
                    : dict.sidebar.planFree}
            </span>
          </div>
          {data?.plan !== "PRO" && data?.plan !== "AGENCY" && (
            <Link
              href={`/${lang}/pricing`}
              className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
            >
              {d.upgrade} →
            </Link>
          )}
        </div>

        <p className="text-xs text-muted mb-4">{d.currentPeriod}</p>

        <div className="space-y-5">
          {/* DMs this month — has a progress bar */}
          {(() => {
            const used = data?.dmQuota?.used ?? data?.workspace.dmsSentThisPeriod ?? 0;
            const limit = data?.dmQuota?.limit ?? null;
            const pct = limit ? Math.min(100, (used / limit) * 100) : null;
            return (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground">{d.dmsThisMonth}</span>
                  <span className="text-xs tabular-nums text-muted">
                    {used.toLocaleString()}
                    {limit !== null ? ` / ${limit.toLocaleString()}` : ""}
                  </span>
                </div>
                {pct !== null && (
                  <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct > 90 ? "bg-error" : pct > 70 ? "bg-warning" : "bg-accent"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })()}

          {/* Active campaigns */}
          <div className="flex items-center justify-between py-2.5 border-t border-border">
            <span className="text-sm text-foreground">{dict.dashboard.statActiveCampaigns}</span>
            <span className="text-xs tabular-nums font-medium text-foreground">
              {data?.activeAutomations ?? 0}
              {data?.plan === "FREE" ? " / 2" : ""}
            </span>
          </div>

          {/* Instagram accounts */}
          <div className="flex items-center justify-between py-2.5 border-t border-border">
            <span className="text-sm text-foreground">{d.accountsLabel}</span>
            <span className="text-xs tabular-nums font-medium text-foreground">
              {data?.instagramAccounts.length ?? 0}
              {data?.plan === "FREE" || data?.plan === "STANDART" ? " / 1" : " / 5"}
            </span>
          </div>

          {/* Link clicks this month */}
          <div className="flex items-center justify-between py-2.5 border-t border-border">
            <span className="text-sm text-foreground">{dict.dashboard.statClicks}</span>
            <span className="text-xs tabular-nums font-medium text-foreground">
              {(data?.clicksThisMonth ?? 0).toLocaleString()}
            </span>
          </div>

          {/* Contacts reached */}
          <div className="flex items-center justify-between py-2.5 border-t border-border">
            <span className="text-sm text-foreground">{d.contactsLabel}</span>
            <span className="text-xs tabular-nums font-medium text-foreground">
              {(data?.contactsCount ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
