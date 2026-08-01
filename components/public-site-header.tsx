"use client";

import { useState } from "react";
import Link from "next/link";

function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 32"
      width="20"
      height="23"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M0 32L5 0H24L21 15H13L23 32H15L10 17L7 32H0ZM11 4.5H19L17.5 11H10L11 4.5Z"
      />
    </svg>
  );
}

export default function PublicSiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border">
      {/* Blue accent bar */}
      <div className="h-1 bg-accent w-full" />

      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-accent"
          aria-label="replie bosh sahifa"
        >
          <Logo />
          <span className="text-base font-bold text-foreground">replie</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted hover:text-foreground transition-colors"
          >
            Narxlar
          </Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
          >
            Kirish
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center bg-accent px-4 py-2 text-sm font-semibold text-white rounded-md hover:bg-accent-hover transition-colors shadow-sm"
          >
            Boshlash
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="inline-flex md:hidden items-center justify-center rounded-md p-2 text-muted hover:text-foreground transition-colors"
          aria-label={open ? "Menyuni yopish" : "Menyuni ochish"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="17" y2="6" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="3" y1="14" x2="17" y2="14" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-surface">
          <div className="mx-auto max-w-6xl space-y-1 px-5 pb-4 pt-2">
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-background transition-colors"
            >
              Narxlar
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-background transition-colors"
            >
              Kirish
            </Link>
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center bg-accent px-4 py-2.5 text-sm font-semibold text-white rounded-md hover:bg-accent-hover transition-colors"
            >
              Boshlash
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
