"use client";

import { useParams, usePathname } from "next/navigation";
import { useDict } from "@/components/dictionary-provider";

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
  const dict = useDict();
  const params = useParams();
  const lang = (params.lang as string) || "uz";
  const pathname = usePathname();

  const stripped = pathname.replace(new RegExp(`^/${lang}`), "") || "/dashboard";
  const title = dict.topBar.pageTitles[stripped] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 lg:px-6 border-b border-border bg-surface shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-md border border-border text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          aria-label={dict.topBar.menuOpen}
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
            ? dict.topBar.accounts.replace("{{n}}", String(instagramAccountCount))
            : `@${instagramUsername}`}
        </p>
      ) : (
        <a
          href="/api/instagram/connect"
          className="text-sm font-semibold px-3.5 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
        >
          {dict.topBar.connect}
        </a>
      )}
    </header>
  );
}
