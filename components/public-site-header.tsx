"use client";

import { useState } from "react";
import Link from "next/link";

function Logo() {
  return (
    <svg viewBox="0 0 28 32" style={{ width: 24, height: 28 }} fill="#0145F2" aria-hidden="true">
      <path fillRule="evenodd" d="M0 32L5 0H24L21 15H13L23 32H15L10 17L7 32H0ZM11 4.5H19L17.5 11H10L11 4.5Z" />
    </svg>
  );
}

export default function PublicSiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid #E2E8EF" }}>
      {/* Blue accent bar */}
      <div style={{ height: 4, background: "#0145F2", width: "100%" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <Link href="/" aria-label="replie bosh sahifa" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Logo />
          <span style={{ fontSize: 20, fontWeight: 800, color: "#1A1A1A", letterSpacing: "-0.03em" }}>eplie</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex" style={{ alignItems: "center", gap: 32 }}>
          <Link href="/pricing" style={{ fontSize: 14, fontWeight: 500, color: "#5B6472", textDecoration: "none" }}>
            Narxlar
          </Link>
        </nav>

        <div className="hidden md:flex" style={{ alignItems: "center", gap: 8 }}>
          <Link href="/login" style={{ fontSize: 14, fontWeight: 500, color: "#5B6472", textDecoration: "none", padding: "10px 18px" }}>
            Kirish
          </Link>
          <Link href="/pricing" style={{ fontSize: 14, fontWeight: 600, color: "#fff", background: "#0145F2", padding: "10px 22px", borderRadius: 8, textDecoration: "none" }}>
            Boshlash
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Menyuni yopish" : "Menyuni ochish"}
          className="flex md:hidden"
          style={{ alignItems: "center", justifyContent: "center", width: 40, height: 40, background: "none", border: "1px solid #E2E8EF", borderRadius: 8, cursor: "pointer", padding: 0 }}
        >
          {open ? (
            <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="20" y2="20" /><line x1="20" y1="4" x2="4" y2="20" />
            </svg>
          ) : (
            <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden" style={{ position: "fixed", top: 68, left: 0, right: 0, zIndex: 49, background: "#fff", borderBottom: "1px solid #E2E8EF", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
          <Link href="/pricing" onClick={() => setOpen(false)} style={{ fontSize: 15, fontWeight: 500, color: "#1A1A1A", padding: "14px 0", borderBottom: "1px solid #E2E8EF", textDecoration: "none" }}>Narxlar</Link>
          <Link href="/login" onClick={() => setOpen(false)} style={{ fontSize: 15, fontWeight: 500, color: "#1A1A1A", padding: "14px 0", borderBottom: "1px solid #E2E8EF", textDecoration: "none" }}>Kirish</Link>
          <Link href="/pricing" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600, color: "#fff", background: "#0145F2", padding: 14, borderRadius: 8, textDecoration: "none", marginTop: 8 }}>Boshlash</Link>
        </div>
      )}
    </header>
  );
}
