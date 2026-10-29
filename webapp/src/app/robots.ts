import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/calculadora", "/marketing/*", "/nutri/*"],
      disallow: ["/dashboard/", "/api/"],
    },
    sitemap: "https://nutringest.com/sitemap.xml",
  };
}
