import { redirect } from "next/navigation";

/** Legacy path — see the note in ../page.tsx about carrying the locale. */
export default async function NewAutomationRedirectPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/campaigns/new`);
}
