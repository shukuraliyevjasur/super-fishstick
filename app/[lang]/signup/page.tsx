import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AuthError } from "next-auth";
import { normaliseEmail, signIn } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import {
  MIN_PASSWORD_LENGTH,
  hashPassword,
  validatePassword,
} from "@/lib/auth/password";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n/t";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[]>> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const d = await getDictionary(lang);
  return { title: d.signup.metaTitle, description: d.signup.metaDesc };
}

export default async function SignupPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const d = await getDictionary(lang);
  const s = d.signup;

  const sp = await searchParams;
  const error = (sp as Record<string, string>)?.error;
  const callbackUrlParam = (sp as Record<string, string>)?.callbackUrl;
  const callbackUrl = callbackUrlParam ?? `/${lang}/dashboard`;

  async function register(formData: FormData) {
    "use server";

    const email = normaliseEmail(formData.get("email"));
    const password = String(formData.get("password") ?? "");

    const fail = (reason: string) => {
      const qs = new URLSearchParams({ error: reason });
      if (callbackUrlParam) qs.set("callbackUrl", callbackUrlParam);
      redirect(`/${lang}/signup?${qs.toString()}`);
    };

    if (!EMAIL_RE.test(email)) fail("email");
    if (validatePassword(password) === "tooShort") fail("short");

    // An address that already exists never gets a password set here — not even
    // a legacy magic-link account with none. Doing so would let anyone claim
    // someone else's account by "signing up" as them. They are sent to sign in,
    // where the magic link is available as recovery.
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) fail("taken");

    let userId: string;
    try {
      const created = await prisma.user.create({
        data: { email, passwordHash: await hashPassword(password) },
        select: { id: true },
      });
      userId = created.id;
    } catch {
      // Unique-constraint loss against a concurrent signup for the same email.
      fail("taken");
      return;
    }

    // Created directly rather than through the adapter, so the createUser event
    // that normally provisions the workspace does not fire. Do it explicitly.
    await ensureWorkspaceForUser(userId, email);

    // Best effort: a Resend outage must not cost the user their account. The
    // dashboard banner offers a resend if this never lands.
    try {
      await signIn("resend", { email, redirect: false });
    } catch {
      // swallowed on purpose — see above
    }

    try {
      await signIn("password", { email, password, redirectTo: callbackUrl });
    } catch (err) {
      // A successful signIn throws NEXT_REDIRECT, which must propagate.
      if (err instanceof AuthError) redirect(`/${lang}/login`);
      throw err;
    }
  }

  const fieldClass =
    "w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition-colors";

  const message =
    error === "taken"
      ? s.errTaken
      : error === "email"
        ? s.errInvalidEmail
        : error === "short"
          ? t(s.errTooShort, { n: String(MIN_PASSWORD_LENGTH) })
          : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href={`/${lang}`} className="text-xl font-bold text-foreground">
            replie
          </Link>
          <p className="text-muted text-sm leading-relaxed mt-2">{s.sub}</p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-8 shadow-sm">
          <h1 className="text-lg font-semibold text-foreground mb-6">{s.h1}</h1>

          <form action={register} className="space-y-5">
            {message && (
              <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
                {message}
              </p>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                {s.emailLabel}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={s.emailPlaceholder}
                className={fieldClass}
              />
            </div>

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
                placeholder={s.passwordPlaceholder}
                className={fieldClass}
              />
              <p className="text-xs text-subtle">
                {t(s.passwordHint, { n: String(MIN_PASSWORD_LENGTH) })}
              </p>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              {s.submitBtn}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {s.haveAccount}{" "}
            <Link href={`/${lang}/login`} className="font-medium text-accent hover:underline">
              {s.signInLink}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
