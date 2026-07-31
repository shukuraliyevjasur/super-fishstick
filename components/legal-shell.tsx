import Link from "next/link";

interface LegalShellProps {
  title: string;
  description: string;
  updatedAt: string;
  children: React.ReactNode;
}

export default function LegalShell({
  title,
  description,
  updatedAt,
  children,
}: LegalShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="text-base font-bold text-foreground">
            replie
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Kirish
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-14">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          So&apos;nggi yangilanish / Last updated: {updatedAt}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted">{description}</p>
        <div className="mt-10 space-y-10 text-sm leading-7">
          {children}
        </div>
      </article>

      <footer className="border-t border-border py-8 mt-10">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-5 text-xs text-muted">
          <span>© 2026 replie</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Maxfiylik</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Shartlar</Link>
            <Link href="/data-deletion" className="hover:text-foreground transition-colors">Ma&apos;lumotlarni o&apos;chirish</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
