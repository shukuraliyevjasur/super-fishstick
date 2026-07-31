import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing"],
      disallow: ["/dashboard/", "/api/", "/r/"],
    },
    sitemap: `${process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "https://replie.uz"}/sitemap.xml`,
  };
}
