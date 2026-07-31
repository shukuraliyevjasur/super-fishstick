"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Bosh sahifa",
  "/campaigns": "Kampaniyalar",
  "/campaigns/new": "Yangi kampaniya",
  "/automations": "Kampaniyalar",
  "/automations/new": "Yangi kampaniya",
  "/logs": "DM Jurnali",
  "/settings": "Sozlamalar",
  "/diagnostics": "Diagnostika",
  "/overview": "Statistika",
  "/inbox": "Xabarlar",
};

interface TopBarProps {
  onMenuClick: () => void;
  instagramUsername: string | null;
  instagramAccountCount: number;
}

export default function TopBar({
  onMenuClick,
  instagramUsername,
  instagramAccountCount,
}: TopBarProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 lg:px-6 border-b border-border bg-surface shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-md border border-border text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          aria-label="Menuni ochish"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
      </div>

      {instagramAccountCount > 0 ? (
        <p className="text-sm text-muted">
          {instagramAccountCount > 1
            ? `${instagramAccountCount} ta akkaunt`
            : `@${instagramUsername}`}
        </p>
      ) : (
        <a
          href="/api/instagram/connect"
          className="text-sm font-semibold px-3.5 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          Instagram ulash
        </a>
      )}
    </header>
  );
}
