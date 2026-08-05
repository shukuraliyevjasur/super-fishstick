import { redirect } from "next/navigation";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getLogs } from "@/lib/data/logs";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { prisma } from "@/lib/db/client";
import { intlLocale } from "@/lib/i18n/format";
import StatusBadge from "@/components/status-badge";
import LogFilters from "@/components/logs/log-filters";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<{ page?: string; status?: string; accountId?: string }>;
};

export default async function LogsPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const sp = (await searchParams) ?? {};
  const locale = hasLocale(lang) ? lang : "uz";

  const dict = await getDictionary(locale);
  const d = dict.logs;

  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect(`/${locale}/login`);

  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10));
  const status = sp.status ?? "ALL";
  const accountId = sp.accountId ?? "all";

  const [{ logs, pagination }, accounts] = await Promise.all([
    getLogs(workspaceId, { page, status: status !== "ALL" ? status : null, accountId }),
    prisma.instagramAccount.findMany({
      where: { workspaceId },
      orderBy: { connectedAt: "desc" },
      select: { id: true, username: true, instagramId: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <LogFilters
        currentStatus={status}
        currentPage={page}
        currentAccountId={accountId}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={pagination.limit}
        accounts={accounts}
        dict={{ logs: dict.logs, dmStatus: dict.dmStatus }}
      />

      {/* Table */}
      <div className="panel rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left bg-background">
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{d.colCommenter}</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{d.colComment}</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{d.colCampaign}</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{d.colAccount}</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{d.colStatus}</th>
                <th className="px-6 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{d.colTime}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted">
                    {d.empty}
                  </td>
                </tr>
              )}
              {logs.map((log, i) => (
                <tr
                  key={log.id}
                  className={`transition-colors hover:bg-surface-hover ${i % 2 === 1 ? "bg-background/50" : ""}`}
                >
                  <td className="px-6 py-3.5">
                    <span className="font-medium text-foreground">
                      @{log.commenterName ?? log.commenterId.slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 max-w-[200px]">
                    <span className="text-muted truncate block">{log.commentText}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-muted">{log.automation.name}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="text-muted">@{log.instagramAccount.username}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-6 py-3.5 text-muted whitespace-nowrap text-xs">
                    {new Date(log.createdAt).toLocaleString(intlLocale(dict.locale), {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
