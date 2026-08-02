import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { getCampaignTemplate } from "@/lib/templates/campaign-templates";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { t } from "@/components/dictionary-provider";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[]>> };

export async function generateMetadata({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const d = await getDictionary(lang);
  return { title: d.login.metaTitle, description: d.login.metaDesc };
}

export default async function LoginPage({
  params,
  searchParams,
}: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const d = await getDictionary(lang);
  const l = d.login;

  const sp = await searchParams;
  const checkEmail = (sp as Record<string, string>)?.checkEmail === "1";
  const templateSlug = (sp as Record<string, string>)?.template;
  const callbackUrlParam = (sp as Record<string, string>)?.callbackUrl;
  // Magic link stays reachable as a fallback — it is also the way a user who
  // forgot their password gets back in, so there is no separate reset flow.
  const linkMode = (sp as Record<string, string>)?.mode === "link";
  const failed = (sp as Record<string, string>)?.error === "invalid";

  const selectedTemplate = getCampaignTemplate(templateSlug);
  const templateCallbackUrl = selectedTemplate
    ? `/${lang}/campaigns/new?template=${selectedTemplate.slug}`
    : null;
  const callbackUrl = callbackUrlParam ?? templateCallbackUrl ?? `/${lang}/dashboard`;

  // Preserved across the password/link toggle and the failed-login redirect, so
  // an invite or template deep link is not lost when someone mistypes.
  const carried = new URLSearchParams();
  if (templateSlug) carried.set("template", templateSlug);
  if (callbackUrlParam) carried.set("callbackUrl", callbackUrlParam);
  const carriedQs = carried.toString();

  function loginHref(extra?: Record<string, string>) {
    const qs = new URLSearchParams(carriedQs);
    for (const [k, v] of Object.entries(extra ?? {})) qs.set(k, v);
    const s = qs.toString();
    return `/${lang}/login${s ? `?${s}` : ""}`;
  }

  async function sendMagicLink(formData: FormData) {
    "use server";
    await signIn("resend", {
      email: String(formData.get("email") ?? ""),
      redirectTo: callbackUrl,
    });
  }

  async function loginWithPassword(formData: FormData) {
    "use server";
    try {
      await signIn("password", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirectTo: callbackUrl,
      });
    } catch (error) {
      // A successful signIn throws NEXT_REDIRECT, which must propagate. Only a
      // genuine auth failure is turned into an error message.
      if (error instanceof AuthError) {
        const qs = new URLSearchParams(carriedQs);
        qs.set("error", "invalid");
        redirect(`/${lang}/login?${qs.toString()}`);
      }
      throw error;
    }
  }

  const fieldClass =
    "w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition-colors";
  const submitClass =
    "w-full inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href={`/${lang}`} className="text-xl font-bold text-foreground">
            replie
          </Link>
          <p className="text-muted text-sm leading-relaxed mt-2">
            {selectedTemplate
              ? t(l.subTemplate, { title: selectedTemplate.title })
              : l.subDefault}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-8 shadow-sm">
          {selectedTemplate && !checkEmail && (
            <div className="mb-5 border border-accent/20 bg-accent/5 rounded-lg p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                {l.templateSelected}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {selectedTemplate.title}
              </p>
            </div>
          )}

          {checkEmail ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">{l.checkEmailH2}</h2>
              <p className="text-sm text-muted">{l.checkEmailSub}</p>
            </div>
          ) : linkMode ? (
            <form action={sendMagicLink} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  {l.emailLabel}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={l.emailPlaceholder}
                  className={fieldClass}
                />
              </div>
              <button type="submit" className={submitClass}>
                {l.submitBtn}
              </button>
              <p className="text-center">
                <Link href={loginHref()} className="text-sm text-accent hover:underline">
                  {l.usePasswordInstead}
                </Link>
              </p>
            </form>
          ) : (
            <form action={loginWithPassword} className="space-y-5">
              {failed && (
                <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
                  {l.errInvalid}
                </p>
              )}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  {l.emailLabel}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={l.emailPlaceholder}
                  className={fieldClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  {l.passwordLabel}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder={l.passwordPlaceholder}
                  className={fieldClass}
                />
              </div>
              <button type="submit" className={submitClass}>
                {l.submitPassword}
              </button>
              <p className="text-center text-sm text-muted">
                {l.forgotPassword}{" "}
                <Link href={loginHref({ mode: "link" })} className="text-accent hover:underline">
                  {l.useLinkInstead}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
