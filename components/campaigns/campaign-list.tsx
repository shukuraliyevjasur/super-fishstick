"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AccountSelect, { type AccountOption } from "@/components/account-select";
import { t } from "@/components/dictionary-provider";
import type { CampaignData } from "@/lib/data/campaigns";
import type { Dict } from "@/lib/i18n/types";

interface Props {
  initialCampaigns: CampaignData[];
  initialAccounts: AccountOption[];
  selectedAccountId: string;
  lang: string;
  dict: Dict["campaigns"];
}

export default function CampaignList({
  initialCampaigns,
  initialAccounts,
  selectedAccountId,
  lang,
  dict: c,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [automations, setAutomations] = useState<CampaignData[]>(initialCampaigns);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [playingVideo, setPlayingVideo] = useState<{ url: string; postUrl: string | null } | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");

  // Keep local state in sync when RSC re-renders with new props (account changed)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- deliberate synchronous reset when server re-renders with new account data; cheaper than a separate render cycle */
    setAutomations(initialCampaigns);
    setSearch("");
    setStatusFilter("all");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [initialCampaigns]);

  // Fetch Instagram post thumbnails (legitimately client-side: hits Instagram CDN)
  useEffect(() => {
    if (automations.length === 0) return;
    let cancelled = false;
    const accountIds = Array.from(new Set(automations.map((a) => a.instagramAccountId))).sort();

    Promise.all(
      accountIds.map((accountId) =>
        fetch(`/api/instagram/posts?instagramAccountId=${accountId}&limit=50`)
          .then((res) => res.json())
          .then((payload) =>
            payload.success
              ? (payload.data as { id: string; media_type?: string; media_url?: string; thumbnail_url?: string }[])
              : []
          )
          .catch(() => [])
      )
    ).then((lists) => {
      if (cancelled) return;
      const thumbs: Record<string, string> = {};
      const vids: Record<string, string> = {};
      for (const list of lists) {
        for (const media of list) {
          const url = media.thumbnail_url ?? media.media_url;
          if (url) thumbs[media.id] = url;
          if (media.media_type === "VIDEO" && media.media_url) vids[media.id] = media.media_url;
        }
      }
      setThumbnails(thumbs);
      setVideos(vids);
    });

    return () => { cancelled = true; };
  }, [automations]);

  useEffect(() => {
    if (!playingVideo) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPlayingVideo(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playingVideo]);

  function handleAccountChange(accountId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (accountId === "all") {
      params.delete("accountId");
    } else {
      params.set("accountId", accountId);
    }
    router.push(`?${params.toString()}`);
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await fetch(`/api/automations?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: !isActive } : a)));
    } catch (err) {
      console.error("Failed to toggle:", err);
    }
  }

  async function deleteAutomation(id: string) {
    if (!confirm(c.deleteConfirm)) return;
    try {
      await fetch(`/api/automations?id=${id}`, { method: "DELETE" });
      setAutomations((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  async function duplicateAutomation(auto: CampaignData) {
    setMenuOpenId(null);
    const specific = !auto.matchAnyPost && !auto.pendingNextReel;
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${auto.name} copy`,
          instagramAccountId: auto.instagramAccountId,
          postId: specific ? auto.postId : null,
          postUrl: specific ? auto.postUrl : null,
          matchAnyPost: auto.matchAnyPost,
          pendingNextReel: auto.pendingNextReel,
          matchAnyWord: auto.matchAnyWord,
          keywords: auto.keywords,
          dmMessage: auto.dmMessage,
          openingDmEnabled: auto.openingDmEnabled,
          openingDmMessage: auto.openingDmMessage,
          openingDmButtonLabel: auto.openingDmButtonLabel,
          publicReplyEnabled: auto.publicReplyEnabled,
          publicReplyMessages: auto.publicReplyMessages,
          trackedDestinationUrl: auto.trackedLinks[0]?.destinationUrl ?? "",
          secondaryDestinationUrl: auto.trackedLinks[1]?.destinationUrl ?? "",
          secondaryButtonLabel: auto.trackedLinks[1]?.label ?? "Havolani ochish",
          requireFollow: auto.requireFollow,
          followPromptMessage: auto.followPromptMessage,
          followPromptButtonLabel: auto.followPromptButtonLabel,
          wholeWordMatch: auto.wholeWordMatch,
          isActive: false,
        }),
      });
      const data = await res.json();
      if (data.success) router.refresh(); // re-runs RSC to get fresh server data
      else console.error("Duplicate failed:", data.error);
    } catch (err) {
      console.error("Failed to duplicate:", err);
    }
  }

  const query = search.trim().toLowerCase();
  const filtered = automations.filter((a) => {
    if (statusFilter === "active" && !a.isActive) return false;
    if (statusFilter === "paused" && a.isActive) return false;
    if (!query) return true;
    return (
      a.name.toLowerCase().includes(query) ||
      a.keywords.some((k) => k.toLowerCase().includes(query)) ||
      a.dmMessage.toLowerCase().includes(query)
    );
  });

  const filterLabels: Record<string, string> = {
    all: c.filterAll,
    active: c.filterActive,
    paused: c.filterPaused,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">
            {t(c.countLabel, { n: String(filtered.length) })}
            {filtered.length !== automations.length ? ` / ${automations.length}` : ""}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {initialAccounts.length > 1 && (
            <AccountSelect
              accounts={initialAccounts}
              value={selectedAccountId}
              onChange={handleAccountChange}
            />
          )}
          <a
            href={`/${lang}/campaigns/import`}
            className="px-4 py-2 rounded-md border border-border text-sm font-medium text-muted hover:text-foreground"
          >
            {c.importBtn}
          </a>
          <a
            href={`/${lang}/campaigns/new`}
            className="px-4 py-2 rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            {c.newBtn}
          </a>
        </div>
      </div>

      {/* Search + status filter */}
      {automations.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={c.searchPlaceholder}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent/40 focus:outline-none"
          />
          <div className="inline-flex shrink-0 rounded-lg bg-surface p-1">
            {(["all", "active", "paused"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  statusFilter === s
                    ? "bg-background font-medium text-foreground ring-1 ring-accent/40"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {filterLabels[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {automations.length === 0 && (
        <div className="panel rounded-md p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">{c.emptyTitle}</h3>
          <p className="text-sm text-muted mb-6 max-w-sm mx-auto">{c.emptyDesc}</p>
          <a
            href={`/${lang}/campaigns/new`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
          >
            {c.emptyBtn}
          </a>
        </div>
      )}

      {/* No matches */}
      {automations.length > 0 && filtered.length === 0 && (
        <div className="panel rounded-md p-8 text-center text-sm text-muted">
          {c.noResults}
        </div>
      )}

      {/* Campaign cards */}
      <div className="space-y-3">
        {filtered.map((auto) => {
          const videoUrl = auto.postId ? videos[auto.postId] : undefined;
          return (
            <div
              key={auto.id}
              onClick={() => router.push(`/${lang}/campaigns/${auto.id}`)}
              className="panel rounded-md p-4 hover:border-border-hover transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                {auto.postId && thumbnails[auto.postId] && (
                  videoUrl ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlayingVideo({ url: videoUrl, postUrl: auto.postUrl });
                      }}
                      aria-label={c.playReel}
                      className="shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbnails[auto.postId!]}
                        alt={c.campaignReel}
                        className="w-12 h-12 rounded-md object-cover border border-border hover:border-border-hover"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    </button>
                  ) : (
                    <a
                      href={auto.postUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbnails[auto.postId!]}
                        alt={c.campaignPost}
                        className="w-12 h-12 rounded-md object-cover border border-border"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    </a>
                  )
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold truncate">{auto.name}</h3>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted">
                      @{auto.instagramAccount.username}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${auto.isActive ? "bg-success/10 text-success" : "bg-muted/15 text-muted"}`}>
                      {auto.isActive ? c.statusActive : c.statusPaused}
                    </span>
                    {auto.pendingNextReel && (
                      <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                        {c.pendingReel}
                      </span>
                    )}
                    {auto.requireFollow && (
                      <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                        Follow gate
                      </span>
                    )}
                    {auto.trackedLinks.length >= 2 && (
                      <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                        {c.twoLinks}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {auto.keywords.map((kw) => (
                      <span key={kw} className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-xs font-medium border border-accent/10">
                        {kw}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-muted truncate">&ldquo;{auto.dmMessage}&rdquo;</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-muted">
                    <span className="font-medium text-foreground">
                      {t(c.sendCount, { n: String(auto._count.dmLogs) })}
                    </span>
                    <span>·</span>
                    <span className="font-medium text-foreground">{auto.analytics.ctr}% CTR</span>
                    <span>·</span>
                    <span>{auto.analytics.sent} sent</span>
                    <span>·</span>
                    <span>{auto.analytics.skipped} skipped</span>
                    <span>·</span>
                    <span>{auto.analytics.failed} failed</span>
                    <span>·</span>
                    <span>{auto.analytics.clicks} clicks</span>
                  </div>
                  {auto.analytics.topKeywords.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {auto.analytics.topKeywords.map((kw) => (
                        <span key={kw.keyword} className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted">
                          {kw.keyword}: {kw.count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleActive(auto.id, auto.isActive)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${auto.isActive ? "bg-accent" : "bg-border"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${auto.isActive ? "left-6" : "left-1"}`} />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpenId((cur) => (cur === auto.id ? null : auto.id))}
                      aria-label="More actions"
                      className="px-2 py-1 rounded-md text-lg leading-none text-muted hover:text-foreground"
                    >
                      ⋯
                    </button>
                    {menuOpenId === auto.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                        <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                          <button
                            onClick={() => void duplicateAutomation(auto)}
                            className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover"
                          >
                            {c.duplicate}
                          </button>
                          <button
                            onClick={() => { setMenuOpenId(null); void deleteAutomation(auto.id); }}
                            className="block w-full px-3 py-2 text-left text-sm text-error hover:bg-surface-hover"
                          >
                            {c.delete}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reel lightbox */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPlayingVideo(null)}
        >
          <div className="relative flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 text-sm">
              {playingVideo.postUrl && (
                <a href={playingVideo.postUrl} target="_blank" rel="noreferrer" className="text-white/70 hover:text-white">
                  {c.openOnInstagram}
                </a>
              )}
              <button type="button" onClick={() => setPlayingVideo(null)} className="text-white/70 hover:text-white">
                {c.close}
              </button>
            </div>
            <video
              src={playingVideo.url}
              controls
              autoPlay
              loop
              playsInline
              className="max-h-[80vh] max-w-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
