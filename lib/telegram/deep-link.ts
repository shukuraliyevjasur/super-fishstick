/**
 * Telegram deep links (T10).
 *
 * `https://t.me/<bot>?start=<campaignId>` is the entire bridge between an
 * Instagram campaign and a Telegram funnel: Telegram hands the payload to the
 * bot on /start, and the engine resolves it back to a campaign and its flow.
 *
 * The payload is the campaign's cuid. Telegram caps `start` at 64 characters
 * and allows only `A-Z a-z 0-9 _ -`, which a cuid satisfies — so no encoding
 * step is needed, and none should be added without checking that cap again.
 */

/** Telegram's documented limit on the /start payload. */
export const START_PAYLOAD_MAX = 64;
const START_PAYLOAD_PATTERN = /^[A-Za-z0-9_-]+$/;

export function isValidStartPayload(payload: string): boolean {
  return (
    payload.length > 0 &&
    payload.length <= START_PAYLOAD_MAX &&
    START_PAYLOAD_PATTERN.test(payload)
  );
}

/**
 * Null when no bot username is configured, so callers render nothing rather
 * than a broken `t.me/undefined` link. The username is deployment-wide (the
 * shared @replie_bot, T4), not per workspace.
 */
export function buildTelegramDeepLink(
  campaignId: string,
  botUsername = process.env.TELEGRAM_BOT_USERNAME
): string | null {
  if (!botUsername) return null;
  if (!isValidStartPayload(campaignId)) return null;

  return `https://t.me/${botUsername.replace(/^@/, "")}?start=${campaignId}`;
}
