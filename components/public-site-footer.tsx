import Link from "next/link";

function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 32"
      width="18"
      height="21"
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

export default function PublicSiteFooter() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 text-sm text-muted sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-accent hover:opacity-80 transition-opacity">
          <Logo />
          <span className="font-semibold text-foreground">replie</span>
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
