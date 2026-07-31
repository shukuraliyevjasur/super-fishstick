import Link from "next/link";

export default function PublicSiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link href="/" className="text-base font-bold text-foreground" aria-label="replie bosh sahifa">
          replie
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/pricing" className="text-sm font-medium text-muted hover:text-foreground transition-colors">
            Narxlar
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors sm:inline-flex"
          >
            Kirish
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center bg-accent px-4 py-2 text-sm font-semibold text-white rounded-md hover:bg-accent-hover transition-colors"
          >
            Boshlash
          </Link>
        </div>
      </div>
    </header>
  );
}
