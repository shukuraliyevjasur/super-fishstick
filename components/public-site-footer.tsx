import Link from "next/link";

function Logo() {
  return (
    <svg viewBox="0 0 28 32" style={{ width: 18, height: 20 }} fill="#0145F2" aria-hidden="true">
      <path fillRule="evenodd" d="M0 32L5 0H24L21 15H13L23 32H15L10 17L7 32H0ZM11 4.5H19L17.5 11H10L11 4.5Z" />
    </svg>
  );
}

export default function PublicSiteFooter() {
  return (
    <footer style={{ background: "#fff", borderTop: "1px solid #E2E8EF", padding: "32px 0" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Logo />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }}>replie</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          {[
            { href: "/pricing", label: "Narxlar" },
            { href: "/privacy", label: "Maxfiylik" },
            { href: "/terms", label: "Shartlar" },
            { href: "/data-deletion", label: "Ma'lumotlarni o'chirish" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{ fontSize: 13, color: "#5B6472", textDecoration: "none" }}>{label}</Link>
          ))}
        </div>
        <span style={{ fontSize: 13, color: "#949CA9" }}>© 2026 replie</span>
      </div>
    </footer>
  );
}
