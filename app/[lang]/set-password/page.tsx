import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import {
  MIN_PASSWORD_LENGTH,
  hashPassword,
  validatePassword,
} from "@/lib/auth/password";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { t } from "@/components/dictionary-provider";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[]>> };

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const d = await getDictionary(lang);
  return { title: d.setPassword.metaTitle, description: d.setPassword.metaDesc };
}

export default async function SetPasswordPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}/login`);

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  // Already set — nothing to do here. Keeps the page harmless if it is
  // bookmarked or reloaded after a successful save.
  if (existing?.passwordHash) redirect(`/${lang}/dashboard`);

  const sp = await searchParams;
  const error = (sp as Record<string, string>)?.error;

  const d = await getDictionary(lang);
  const s = d.setPassword;

  async function save(formData: FormData) {
    "use server";

    const inner = await auth();
    if (!inner?.user?.id) redirect(`/${lang}/login`);

    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (validatePassword(password) === "tooShort") {
      redirect(`/${lang}/set-password?error=tooShort`);
    }
    if (password !== confirm) {
      redirect(`/${lang}/set-password?error=mismatch`);
    }

    await prisma.user.update({
      where: { id: inner.user.id },
      data: { passwordHash: await hashPassword(password) },
    });

    redirect(`/${lang}/dashboard`);
  }

  const fieldClass =
    "w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition-colors";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-xl font-bold text-foreground">replie</span>
        </div>

        <div className="bg-surface border border-border rounded-lg p-8 shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">{s.h1}</h1>
          <p className="mt-2 text-sm text-muted leading-relaxed">{s.sub}</p>

          <form action={save} className="mt-6 space-y-5">
            {error && (
              <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
                {error === "mismatch"
                  ? s.errMismatch
                  : t(s.errTooShort, { n: String(MIN_PASSWORD_LENGTH) })}
              </p>
            )}

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                {s.passwordLabel}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                className={fieldClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm" className="block text-sm font-medium text-foreground">
                {s.confirmLabel}
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                className={fieldClass}
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              {s.submitBtn}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
