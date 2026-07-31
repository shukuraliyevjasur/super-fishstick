import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaignReportBySlug } from "@/lib/reports/data";

type ReportPageProps = {
  params: Promise<{ shareSlug: string }>;
};

function formatDate(date: Date | null) {
  if (!date) return "Hali jo'natilmagan";
  return date.toLocaleDateString("uz-UZ", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted">{helper}</p>
    </div>
  );
}

export async function generateMetadata({
  params,
}: ReportPageProps): Promise<Metadata> {
  const { shareSlug } = await params;
  const report = await getCampaignReportBySlug(shareSlug);

  if (!report) {
    return {
      title: "Hisobot topilmadi",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${report.campaign.name} — Kampaniya hisoboti`,
    description: `${report.campaign.name} kampaniya uchun faqat o'qish uchun hisobot.`,
    robots: { index: false, follow: false },
  };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { shareSlug } = await params;
  const report = await getCampaignReportBySlug(shareSlug);

  if (!report) {
    notFound();
  }

  const maxDaily = Math.max(
    ...report.daily.map((day) => Math.max(day.sent, day.clicks)),
    1
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                Kampaniya hisoboti
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-foreground sm:text-5xl">
                {report.campaign.name}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted">
                <span>@{report.campaign.instagramUsername}</span>
                {report.campaign.goal && (
                  <>
                    <span>·</span>
                    <span>{report.campaign.goal}</span>
                  </>
                )}
                <span>·</span>
                <span>
                  {report.campaign.isActive
                    ? "Faol kampaniya"
                    : "To'xtatilgan kampaniya"}
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4 text-sm md:min-w-64">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Ish maydoni
              </p>
              <p className="mt-2 font-bold text-foreground">
                {report.workspace.name}
              </p>
              <p className="mt-4 text-xs text-muted">
                Yaratildi: {formatDate(report.generatedAt)}
              </p>
              {report.branded && (
                <Link
                  href="/"
                  className="mt-4 inline-flex items-center justify-center rounded-md border border-border bg-surface-hover px-3 py-2 text-xs font-semibold text-muted transition hover:text-foreground"
                >
                  replie tomonidan
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            label="Yuborildi"
            value={report.metrics.sent}
            helper="Muvaffaqiyatli yuborilgan xabarlar."
          />
          <MetricCard
            label="O'tkazildi"
            value={report.metrics.skipped}
            helper="Takroriy, chegara yoki yuborilmagan."
          />
          <MetricCard
            label="Muvaffaqiyatsiz"
            value={report.metrics.failed}
            helper="Ko'rib chiqish talab qiladigan xabarlar."
          />
          <MetricCard
            label="Kliklar"
            value={report.metrics.clicks}
            helper="Kuzatilgan havola tashriflari."
          />
          <MetricCard
            label="CTR"
            value={`${report.metrics.ctr}%`}
            helper="Kliklar / yuborilgan nisbati."
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-lg border border-border bg-surface p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  So&apos;nggi 7 kun
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Kunlik yuborilgan xabarlar va kliklar.
                </p>
              </div>
              <p className="text-xs text-muted">
                So&apos;nggi yuboruv: {formatDate(report.metrics.latestSentAt)}
              </p>
            </div>
            <div className="mt-8 grid h-56 grid-cols-7 items-end gap-3">
              {report.daily.map((day) => (
                <div
                  key={day.date}
                  className="flex h-full flex-col justify-end gap-2"
                >
                  <div className="flex min-h-0 flex-1 items-end gap-1">
                    <div
                      className="w-full bg-accent/75"
                      style={{
                        height: `${Math.max((day.sent / maxDaily) * 100, 4)}%`,
                      }}
                      title={`${day.sent} yuborildi`}
                    />
                    <div
                      className="w-full bg-success/75"
                      style={{
                        height: `${Math.max(
                          (day.clicks / maxDaily) * 100,
                          4
                        )}%`,
                      }}
                      title={`${day.clicks} klik`}
                    />
                  </div>
                  <p className="truncate text-center text-xs text-muted">
                    {day.date}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Yuborildi
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                Kliklar
              </span>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-lg border border-border bg-surface p-6">
              <h2 className="text-xl font-bold text-foreground">
                Asosiy kalit so&apos;zlar
              </h2>
              <div className="mt-5 space-y-3">
                {report.topKeywords.length === 0 && (
                  <p className="text-sm text-muted">
                    Hali kalit so&apos;z ma&apos;lumoti yo&apos;q.
                  </p>
                )}
                {report.topKeywords.map((keyword) => (
                  <div
                    key={keyword.keyword}
                    className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {keyword.keyword}
                    </span>
                    <span className="text-sm text-muted">{keyword.count}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-surface p-6">
              <h2 className="text-xl font-bold text-foreground">
                Kuzatilgan havolalar
              </h2>
              <div className="mt-5 space-y-3">
                {report.trackedLinks.length === 0 && (
                  <p className="text-sm text-muted">
                    Ushbu campaignda kuzatilgan havola yo&apos;q.
                  </p>
                )}
                {report.trackedLinks.map((link) => (
                  <div
                    key={link.slug}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="min-w-0 truncate text-sm text-foreground">
                      {link.destinationHost}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {link.clicks}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <section className="mt-8 rounded-lg border border-border bg-surface p-6">
          <h2 className="text-xl font-bold text-foreground">
            Kampaniya sozlamalari
          </h2>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Kalit so&apos;zlar
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {report.campaign.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Yaratilgan
              </p>
              <p className="mt-3 text-sm text-foreground">
                {formatDate(report.campaign.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Manba post
              </p>
              {report.campaign.postUrl ? (
                <a
                  href={report.campaign.postUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-accent transition hover:text-accent-hover"
                >
                  Instagram postini ko&apos;rish
                </a>
              ) : (
                <p className="mt-3 text-sm text-muted">Biriktirilmagan</p>
              )}
            </div>
          </div>
        </section>

        {report.branded && (
          <footer className="mt-8 border-t border-border pt-6 text-center text-xs text-muted">
            replie bilan ishlaydi.
          </footer>
        )}
      </section>
    </main>
  );
}
