import { redirect } from "next/navigation";

/**
 * Legacy path. Campaigns used to live at /automations.
 *
 * The redirect target must carry the locale: an unprefixed `/campaigns` gets
 * re-prefixed by the locale middleware from `Accept-Language`, so a user
 * browsing in Russian with an English browser would land on `/en/campaigns`.
 */
export default async function AutomationsRedirectPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/campaigns`);
}
