import "server-only";
import { prisma } from "@/lib/db/client";
import { DmStatus } from "@/app/generated/prisma/client";

export interface LogEntry {
  id: string;
  commenterId: string;
  commenterName: string | null;
  commentText: string;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  automation: { name: string; keywords: string[] };
  instagramAccount: { username: string };
}

export interface LogPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function getLogs(
  workspaceId: string,
  opts: { page?: number; status?: string | null; accountId?: string | null; limit?: number }
): Promise<{ logs: LogEntry[]; pagination: LogPagination }> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const skip = (page - 1) * limit;

  const parsedStatus =
    opts.status && Object.values(DmStatus).includes(opts.status as DmStatus)
      ? (opts.status as DmStatus)
      : null;

  const where = {
    workspaceId,
    ...(parsedStatus ? { status: parsedStatus } : {}),
    ...(opts.accountId && opts.accountId !== "all" ? { instagramAccountId: opts.accountId } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.dmLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        automation: { select: { name: true, keywords: true } },
        instagramAccount: { select: { username: true } },
      },
    }),
    prisma.dmLog.count({ where }),
  ]);

  return {
    logs: logs as LogEntry[],
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
