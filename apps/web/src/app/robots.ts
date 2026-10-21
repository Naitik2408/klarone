import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://klarone.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/laptops", "/laptops/*", "/select", "/terms", "/privacy"],
        disallow: [
          "/staff/",
          "/staff/*",
          "/account/",
          "/account/*",
          "/cart",
          "/checkout",
          "/api/",
          "/api/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
