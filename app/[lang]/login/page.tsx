import { notFound } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth";
import { getCampaignTemplate } from "@/lib/templates/campaign-templates";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { t } from "@/components/dictionary-provider";

export async function generateMetadata({ params }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const d = await getDictionary(lang);
  return { title: d.login.metaTitle, description: d.login.metaDesc };
}

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const d = await getDictionary(lang);
  const l = d.login;

  const sp = await searchParams;
  const checkEmail = (sp as Record<string, string>)?.checkEmail === "1";
  const templateSlug = (sp as Record<string, string>)?.template;
  const callbackUrlParam = (sp as Record<string, string>)?.callbackUrl;

  const selectedTemplate = getCampaignTemplate(templateSlug);
  const templateCallbackUrl = selectedTemplate
    ? `/${lang}/campaigns/new?template=${selectedTemplate.slug}`
    : null;
  const callbackUrl = callbackUrlParam ?? templateCallbackUrl ?? `/${lang}/dashboard`;

  async function sendMagicLink(formData: FormData) {
    "use server";
    await signIn("resend", {
      email: String(formData.get("email") ?? ""),
      redirectTo: callbackUrl,
    });
  }

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
          ) : (
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
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
              >
                {l.submitBtn}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
