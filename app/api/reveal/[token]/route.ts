import { type NextRequest, NextResponse } from "next/server";
import { verifyRevealToken } from "@/lib/meta/reveal-token";
import { getDMQueue, POSTBACK_JOB_NAME } from "@/lib/queue/client";

export const runtime = "nodejs";

const SUCCESS_HTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Check your DMs</title>
<style>
  body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;
    font-family:system-ui,sans-serif;background:#0a0a0a;color:#f5f5f5;text-align:center;padding:24px}
  .icon{font-size:48px;margin-bottom:16px}
  h1{font-size:20px;font-weight:700;margin:0 0 8px}
  p{font-size:15px;color:#a3a3a3;margin:0}
</style>
</head>
<body>
<div>
  <div class="icon">✉️</div>
  <h1>Check your DMs!</h1>
  <p>Your link is on its way.</p>
</div>
</body>
</html>`;

const EXPIRED_HTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Link expired</title>
<style>
  body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;
    font-family:system-ui,sans-serif;background:#0a0a0a;color:#f5f5f5;text-align:center;padding:24px}
  .icon{font-size:48px;margin-bottom:16px}
  h1{font-size:20px;font-weight:700;margin:0 0 8px}
  p{font-size:15px;color:#a3a3a3;margin:0}
</style>
</head>
<body>
<div>
  <div class="icon">⏳</div>
  <h1>Link expired</h1>
  <p>Ask for the link again by commenting.</p>
</div>
</body>
</html>`;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const data = verifyRevealToken(token);
  if (!data) {
    return new NextResponse(EXPIRED_HTML, {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const queue = getDMQueue();
  await queue.add(
    POSTBACK_JOB_NAME,
    {
      instagramAccountId: data.instagramAccountId,
      userId: data.userId,
      payload: data.payload,
    },
    {
      jobId: `reveal_link_${data.instagramAccountId}_${data.userId}_${data.payload.replace(/:/g, "_")}`,
    }
  );

  return new NextResponse(SUCCESS_HTML, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
