import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCampaignReportBySlug } from "@/lib/reports/data";
import TelegramReady from "@/app/miniapp/telegram-ready";

type Props = {
  params: Promise<{ shareSlug: string }>;
};

function formatDate(date: Date | null) {
  if (!date) return "—";
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
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted">{helper}</p>
    </div>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareSlug } = await params;
  const report = await getCampaignReportBySlug(shareSlug);

  if (!report) {
    return {
      title: "Hisobot topilmadi",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${report.campaign.name} — Hisobot`,
    robots: { index: false, follow: false },
  };
}

export default async function MiniAppReportPage({ params }: Props) {
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
    <main className="min-h-screen bg-background px-4 pb-8 pt-5">
      <TelegramReady />

      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          Kampaniya hisoboti
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-tight text-foreground">
          {report.campaign.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>@{report.campaign.instagramUsername}</span>
          {report.campaign.goal && (
            <>
              <span>·</span>
              <span>{report.campaign.goal}</span>
            </>
          )}
          <span>·</span>
          <span>
            {report.campaign.isActive ? "Faol" : "To'xtatilgan"}
          </span>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Yuborildi"
          value={report.metrics.sent}
          helper="Muvaffaqiyatli yuborilgan."
        />
        <MetricCard
          label="Kliklar"
          value={report.metrics.clicks}
          helper="Havola tashriflari."
        />
        <MetricCard
          label="CTR"
          value={`${report.metrics.ctr}%`}
          helper="Kliklar / yuborilgan."
        />
        <MetricCard
          label="O'tkazildi"
          value={report.metrics.skipped}
          helper="Takroriy yoki chegara."
        />
        <MetricCard
          label="Muvaffaqiyatsiz"
          value={report.metrics.failed}
          helper="Ko'rib chiqish kerak."
        />
      </section>

      <section className="mt-5 rounded-lg border border-border bg-surface p-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">
              So&apos;nggi 7 kun
            </h2>
            <p className="mt-1 text-xs text-muted">
              Kunlik yuborilganlar va kliklar.
            </p>
          </div>
          <p className="text-xs text-muted">
            {formatDate(report.metrics.latestSentAt)}
          </p>
        </div>
        <div className="mt-5 grid h-40 grid-cols-7 items-end gap-2">
          {report.daily.map((day) => (
            <div
              key={day.date}
              className="flex h-full flex-col justify-end gap-1"
            >
              <div className="flex min-h-0 flex-1 items-end gap-0.5">
                <div
                  className="w-full rounded-t bg-accent/75"
                  style={{
                    height: `${Math.max((day.sent / maxDaily) * 100, 4)}%`,
                  }}
                  title={`${day.sent} yuborildi`}
                />
                <div
                  className="w-full rounded-t bg-success/75"
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
        <div className="mt-3 flex gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" />
            Yuborildi
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            Kliklar
          </span>
        </div>
      </section>

      {report.topKeywords.length > 0 && (
        <section className="mt-5 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-base font-bold text-foreground">
            Asosiy kalit so&apos;zlar
          </h2>
          <div className="mt-3 space-y-2">
            {report.topKeywords.map((keyword) => (
              <div
                key={keyword.keyword}
                className="flex items-center justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0"
              >
                <span className="text-sm font-semibold text-foreground">
                  {keyword.keyword}
                </span>
                <span className="text-sm text-muted">{keyword.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {report.trackedLinks.length > 0 && (
        <section className="mt-5 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-base font-bold text-foreground">
            Kuzatilgan havolalar
          </h2>
          <div className="mt-3 space-y-2">
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
      )}

      <section className="mt-5 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-bold text-foreground">
          Kampaniya
        </h2>
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Kalit so&apos;zlar
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {report.campaign.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-semibold text-foreground"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Yaratilgan
              </p>
              <p className="mt-1 text-sm text-foreground">
                {formatDate(report.campaign.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Ish maydoni
              </p>
              <p className="mt-1 text-sm text-foreground">
                {report.workspace.name}
              </p>
            </div>
          </div>
        </div>
      </section>

      {report.branded && (
        <footer className="mt-6 text-center text-xs text-muted">
          replie bilan ishlaydi.
        </footer>
      )}
    </main>
  );
}
