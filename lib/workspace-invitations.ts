import { randomBytes } from "node:crypto";

const INVITE_TTL_DAYS = 14;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function normalizeInvitationEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateInvitationToken() {
  return randomBytes(18).toString("base64url");
}

export function getInvitationExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);
  return expiresAt;
}

export function buildInvitationUrl(token: string, baseUrl?: string) {
  const resolvedBaseUrl =
    baseUrl ??
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXTAUTH_URL ?? "http://localhost:3000");

  return `${resolvedBaseUrl.replace(/\/$/, "")}/invite/${token}`;
}

export async function sendInvitationEmail({
  to,
  inviterName,
  workspaceName,
  inviteUrl,
}: {
  to: string;
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return { sent: false, reason: "missing env: RESEND_API_KEY or EMAIL_FROM" };
  }

  const subject = `${inviterName} invited you to join ${workspaceName} on replie`;
  const text = [
    `Hi,`,
    ``,
    `${inviterName} has invited you to join the "${workspaceName}" workspace on replie — Instagram DM automation.`,
    ``,
    `Accept your invitation (valid for ${INVITE_TTL_DAYS} days):`,
    inviteUrl,
    ``,
    `If you did not expect this, you can ignore this email.`,
  ].join("\n");

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { sent: false, reason: `resend ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}` };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : "send failed" };
  }
}

