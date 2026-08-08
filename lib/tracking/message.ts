export interface MessageTrackedLink {
  slug: string;
  destinationUrl: string;
}

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/i;

function trimTrailingPunctuation(url: string) {
  return url.replace(/[.,!?;:]+$/, "");
}

export function extractFirstUrl(message: string): string | null {
  const match = message.match(URL_PATTERN);
  if (!match) return null;

  try {
    const url = trimTrailingPunctuation(match[0]);
    return new URL(url).toString();
  } catch {
    return null;
  }
}

export function replaceUrlWithTrackedPlaceholder(
  message: string,
  destinationUrl: string | null | undefined
) {
  if (!destinationUrl) return message;
  if (message.includes(destinationUrl)) {
    return message.replace(destinationUrl, "{link}");
  }

  const withoutTrailingSlash = destinationUrl.replace(/\/$/, "");
  return message.replace(withoutTrailingSlash, "{link}");
}

/**
 * The platforms that share this renderer. Instagram is the default so every
 * existing call site keeps its current behaviour without being touched (E6).
 */
export type MessagePlatform = "instagram" | "telegram";

/**
 * Per-platform rendering rules.
 *
 * Both entries are identical today, and that is the finding rather than an
 * oversight: the two channels differ in how a link is *delivered* (Instagram
 * attaches a generic-template button, Telegram an inline keyboard) but not in
 * how the body text is substituted. The seam exists so a Telegram-specific rule
 * — a different fallback name, say — has one obvious home, instead of a second
 * renderer drifting out of sync with this one.
 */
const PLATFORM_RULES: Record<MessagePlatform, { fallbackName: string }> = {
  instagram: { fallbackName: "do'stim" },
  telegram: { fallbackName: "do'stim" },
};

/**
 * Personalize {username} and strip the {link} token — used when the link is
 * delivered as a separate button rather than inline in the message text.
 *
 * `recipientName` is whoever the message is addressed to: the commenter on
 * Instagram, the Telegram user's first name on Telegram. `commenterName` is
 * the original Instagram-shaped name for it and still works.
 */
export function renderMessageWithoutLink({
  message,
  recipientName,
  commenterName,
  platform = "instagram",
}: {
  message: string;
  recipientName?: string | null;
  commenterName?: string | null;
  platform?: MessagePlatform;
}) {
  const name = recipientName ?? commenterName;

  return message
    .replace(/\{username\}/gi, name ?? PLATFORM_RULES[platform].fallbackName)
    .replace(/\s*\{link\}\s*/gi, " ")
    .trim();
}

export function buildTrackedUrl(slug: string, baseUrl?: string) {
  const resolvedBaseUrl =
    baseUrl ??
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.APP_URL ??
        process.env.NEXTAUTH_URL ??
        (process.env.NODE_ENV === "production"
          ? (() => { throw new Error("APP_URL env var required in production"); })()
          : "http://localhost:3000"));

  return `${resolvedBaseUrl.replace(/\/$/, "")}/r/${slug}`;
}

export function renderMessageWithTracking({
  message,
  commenterName,
  trackedLinks,
  baseUrl,
}: {
  message: string;
  commenterName?: string | null;
  trackedLinks?: MessageTrackedLink[];
  baseUrl?: string;
}) {
  let rendered = message.replace(/\{username\}/gi, commenterName ?? "do'stim");
  const primaryLink = trackedLinks?.[0];

  if (!primaryLink) return rendered;

  const trackedUrl = buildTrackedUrl(primaryLink.slug, baseUrl);

  if (/\{link\}/i.test(rendered)) {
    return rendered.replace(/\{link\}/gi, trackedUrl);
  }

  if (rendered.includes(primaryLink.destinationUrl)) {
    rendered = rendered.replaceAll(primaryLink.destinationUrl, trackedUrl);
  } else {
    const withoutTrailingSlash = primaryLink.destinationUrl.replace(/\/$/, "");
    rendered = rendered.replaceAll(withoutTrailingSlash, trackedUrl);
  }

  return rendered;
}
