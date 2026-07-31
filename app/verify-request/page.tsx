import Link from "next/link";

export const metadata = {
  title: "Emailingizni tekshiring - replie",
  description: "Kirish havolasi emailingizga yuborildi.",
};

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-xl font-bold text-foreground">
            replie
          </Link>
        </div>

        <div className="bg-surface border border-border rounded-xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Emailingizni tekshiring</h2>
          <p className="text-sm text-muted">
            Xavfsiz kirish havolasini emailingizga yubordik. Davom etish uchun shu qurilmada oching.
          </p>
          <p className="mt-6 text-sm">
            <Link href="/login" className="text-accent hover:underline font-medium">
              Kirishga qaytish
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
