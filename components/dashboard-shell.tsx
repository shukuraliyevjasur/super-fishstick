"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import { useDict } from "@/components/dictionary-provider";

interface DashboardShellProps {
  children: React.ReactNode;
  workspaceName: string;
  plan: string;
  instagramUsername: string | null;
  instagramAccountCount: number;
}

export default function DashboardShell({
  children,
  workspaceName,
  plan,
  instagramUsername,
  instagramAccountCount,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dict = useDict();
  const params = useParams();
  const lang = (params.lang as string) || "uz";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        workspaceName={workspaceName}
        plan={plan}
      />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          instagramUsername={instagramUsername}
          instagramAccountCount={instagramAccountCount}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        <a
          href="https://t.me/ceo_syr"
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-accent text-white text-sm font-medium px-3 py-3 md:px-4 md:py-2.5 rounded-full shadow-lg hover:bg-accent-hover transition-colors"
          aria-label={dict.common.help}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.448 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.41 13.958l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.46c.537-.194 1.006.131.738.6z"/>
          </svg>
          <span className="hidden md:inline">{dict.common.help}</span>
        </a>
      </div>
    </div>
  );
}
