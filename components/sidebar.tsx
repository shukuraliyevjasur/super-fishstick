"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useDict } from "@/components/dictionary-provider";

export default function Sidebar({
  isOpen,
  onClose,
  workspaceName,
  plan,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceName: string;
  plan: string;
}) {
  const dict = useDict();
  const params = useParams();
  const lang = (params.lang as string) || "uz";
  const pathname = usePathname();
  const switchPath = pathname.slice(1 + lang.length);

  const navItems = [
    {
      label: dict.sidebar.home,
      path: "/dashboard",
      icon: (
        <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      label: dict.sidebar.stats,
      path: "/overview",
      icon: (
        <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
    },
    {
      label: dict.sidebar.inbox,
      path: "/inbox",
      icon: (
        <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
          <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
        </svg>
      ),
    },
    {
      label: dict.sidebar.campaigns,
      path: "/campaigns",
      icon: (
        <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      ),
    },
    {
      label: dict.sidebar.flows,
      path: "/flows",
      icon: (
        <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="3" width="16" height="5" rx="1.5"/>
          <rect x="9" y="16" width="11" height="5" rx="1.5"/>
          <path d="M7 8v6.5A1.5 1.5 0 008.5 16H9"/>
        </svg>
      ),
    },
    {
      label: dict.sidebar.broadcasts,
      path: "/broadcasts",
      icon: (
        <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11l18-7-7 18-2.5-8.5L3 11z"/>
        </svg>
      ),
    },
    {
      label: dict.sidebar.logs,
      path: "/logs",
      icon: (
        <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      ),
    },
    {
      label: dict.sidebar.settings,
      path: "/settings",
      icon: (
        <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      ),
    },
    {
      label: dict.sidebar.diagnostics,
      path: "/diagnostics",
      icon: (
        <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
    },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-60 bg-surface border-r border-border flex flex-col shadow-sm lg:translate-x-0 lg:static lg:z-auto ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="px-5 py-4 border-b border-border">
          <Link href={`/${lang}/dashboard`} className="text-sm font-bold text-foreground tracking-tight">
            replie
          </Link>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const href = `/${lang}${item.path}`;
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={item.path}
                href={href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-border space-y-3">
          {/* Workspace + plan */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{workspaceName}</p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${
                plan === "AGENCY"
                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                  : plan === "PRO"
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : plan === "STANDART"
                      ? "bg-accent/10 text-accent border border-accent/20"
                      : "bg-border text-muted border border-border-hover"
              }`}
            >
              {plan === "AGENCY"
                ? dict.sidebar.planAgency
                : plan === "PRO"
                  ? dict.sidebar.planPro
                  : plan === "STANDART"
                    ? dict.sidebar.planStandard
                    : dict.sidebar.planFree}
            </span>
          </div>

          {/* Logout button */}
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: `/${lang}/login` })}
            className="w-full flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted hover:border-error/40 hover:bg-error/5 hover:text-error transition-colors"
          >
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"/>
            </svg>
            {dict.sidebar.logOut}
          </button>

          {/* Language switcher */}
          <div className="flex items-center gap-2.5">
            {(["uz", "ru", "en"] as const).flatMap((l, i) => [
              ...(i > 0 ? [<span key={`sep-${l}`} className="text-[10px] text-border">|</span>] : []),
              <Link
                key={l}
                href={`/${l}${switchPath}`}
                onClick={onClose}
                className={`text-[10px] font-semibold transition-colors ${lang === l ? "text-accent" : "text-muted hover:text-foreground"}`}
              >
                {l.toUpperCase()}
              </Link>,
            ])}
          </div>
        </div>
      </aside>
    </>
  );
}
