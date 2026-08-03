const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Sends an operational alert email through Resend.
 *
 * Uses `fetch` against Resend's REST API rather than the `resend` SDK on
 * purpose: the SDK is not currently a dependency (only
 * `next-auth/providers/resend` is, and that talks to this same endpoint), and
 * installing it would regenerate package-lock.json — which breaks `npm ci` on
 * Linux when done from Windows. See HANDOFF.md.
 *
 * Never throws. An alert path that can throw turns a degraded system into a
 * failing cron, which hides the original problem.
 */

export interface AlertResult {
  sent: boolean;
  reason?: string;
}

export async function sendOperationalAlert(
  subject: string,
  lines: string[]
): Promise<AlertResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const to = process.env.ALERT_EMAIL;

  const missing = [
    !apiKey && "RESEND_API_KEY",
    !from && "EMAIL_FROM",
    !to && "ALERT_EMAIL",
  ].filter(Boolean);

  if (missing.length > 0) {
    return { sent: false, reason: `missing env: ${missing.join(", ")}` };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: lines.join("\n"),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        sent: false,
        reason: `resend ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      };
    }

    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "send failed",
    };
  }
}
