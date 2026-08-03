import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getRequestIp, hashClickIp } from "@/lib/tracking/server";
import { isHttpUrl } from "@/lib/validation/url";

type RedirectRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, { params }: RedirectRouteProps) {
  const { slug } = await params;
  const trackedLink = await prisma.trackedLink.findUnique({
    where: { slug },
    select: {
      id: true,
      workspaceId: true,
      automationId: true,
      destinationUrl: true,
      automation: {
        select: {
          instagramAccountId: true,
        },
      },
    },
  });

  if (!trackedLink) {
    return NextResponse.redirect(new URL("/", request.url), { status: 302 });
  }

  await prisma.linkClick.create({
    data: {
      workspaceId: trackedLink.workspaceId,
      automationId: trackedLink.automationId,
      instagramAccountId: trackedLink.automation.instagramAccountId,
      trackedLinkId: trackedLink.id,
      ipHash: hashClickIp(getRequestIp(request)),
      userAgent: request.headers.get("user-agent"),
      referrer: request.headers.get("referer"),
    },
  });

  // Defence in depth. The schema now rejects non-http(s) destinations, but that
  // only guards new writes — rows stored while `z.string().url()` accepted any
  // scheme are still in the database, and their `/r/<slug>` links are already
  // sitting in recipients' inboxes and cannot be recalled. Refuse to bounce a
  // visitor to anything that is not http(s), whatever is stored.
  if (!isHttpUrl(trackedLink.destinationUrl)) {
    return NextResponse.redirect(new URL("/", request.url), { status: 302 });
  }

  return NextResponse.redirect(trackedLink.destinationUrl, { status: 302 });
}
