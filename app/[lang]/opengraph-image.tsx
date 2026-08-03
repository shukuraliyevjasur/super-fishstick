import { ImageResponse } from "next/og";

/**
 * The social card (Q2).
 *
 * The pages declared `twitter:card = summary_large_image` and shipped no image,
 * so every share on Telegram, WhatsApp or an Instagram bio link rendered as a
 * bare text card — a conversion cost on a product whose growth motion *is*
 * Instagram and Telegram.
 *
 * Generated at build time (statically optimised — this uses no request-time
 * API), so it costs no dependency and no runtime.
 *
 * **Deliberately wordmark-only, with no localised copy.** ImageResponse renders
 * with its own bundled font rather than the site's Plus Jakarta Sans, and that
 * font is not guaranteed to carry Cyrillic or the Uzbek `ʻ` (U+02BB). A card
 * with tofu boxes in Russian would be worse than the bare text card this
 * replaces. Keeping it to the brand name and domain renders identically and
 * correctly in both locales. If you want localised copy here, bundle a font
 * file with the right subsets and pass it in `fonts`.
 */

export const alt = "replie";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "0 96px",
          background: "#0B0B0F",
          color: "#FFFFFF",
        }}
      >
        <div
          style={{
            width: 96,
            height: 8,
            background: "#2563EB",
            borderRadius: 4,
            marginBottom: 48,
          }}
        />
        <div style={{ fontSize: 132, fontWeight: 800, letterSpacing: -4 }}>
          replie
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 36,
            color: "#2563EB",
          }}
        >
          replie.uz
        </div>
      </div>
    ),
    size
  );
}
