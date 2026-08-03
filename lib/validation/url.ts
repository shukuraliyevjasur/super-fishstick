import { z } from "zod";

/**
 * URL validation for anything a user can point a link at.
 *
 * `z.string().url()` allowlists no scheme and no host, so it accepts
 * `javascript:`, `data:`, `file:` and anything else with a valid URL shape.
 * Values validated that way reach `NextResponse.redirect()` in
 * `app/r/[slug]/route.ts` and `href` attributes on the public report page.
 *
 * The threat is not `javascript:` — browsers do not execute it from a
 * `Location` header, and React 19 blocks it in `href`. It is an ordinary
 * `https://` attacker host: a paying user can point a tracked link at a phishing
 * page and have `https://replie.uz/r/<slug>` DM'd to third parties from our
 * domain. That laundering gets `replie.uz` flagged by Safe Browsing or Meta,
 * which breaks every legitimate customer's links at once.
 *
 * Private and link-local hosts (169.254.169.254 and friends) are deliberately
 * NOT blocked. Nothing here is server-side fetched — these values are handed to
 * the visitor's browser — so there is no SSRF to prevent, and blocking them
 * would only add false negatives against a threat that does not exist on this
 * path. Revisit if any of these URLs ever becomes something the server fetches.
 */

export function isHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

/** A URL that must be http(s). Use instead of `z.string().url()`. */
export const httpUrlSchema = z
  .string()
  .url()
  .refine(isHttpUrl, { message: "Only http(s) links are allowed" });

/**
 * An http(s) URL, or `""` meaning "no link".
 *
 * The automations API uses empty string to clear a tracked link, distinct from
 * `undefined`, which means "leave unchanged".
 */
export const httpUrlOrEmptySchema = z.union([httpUrlSchema, z.literal("")]);
