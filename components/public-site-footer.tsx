import Link from "next/link";

export default function PublicSiteFooter() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 text-sm text-muted sm:px-6 lg:px-8">
        <Link href="/" className="font-semibold text-foreground hover:text-accent transition-colors">
          replie
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="hover:text-foreground transition-colors">Narxlar</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Maxfiylik</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Shartlar</Link>
          <Link href="/data-deletion" className="hover:text-foreground transition-colors">
            Ma&apos;lumotlarni o&apos;chirish
          </Link>
        </div>
        <span className="text-subtle">© 2026 replie</span>
      </div>
    </footer>
  );
}
