import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://nutringest.com";

  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/tutoriales`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/calculadora`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/marketing/octubre`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  try {
    const apiHost = process.env.INTERNAL_API_URL || "http://localhost:3001";
    const res = await fetch(`${apiHost}/api/portfolio/public/list`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const usernames: string[] = await res.json();
      if (Array.isArray(usernames)) {
        usernames.forEach((username) => {
          routes.push({
            url: `${baseUrl}/nutri/${username}`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
          });
        });
      }
    }
  } catch {
    // Si falla el fetch dinámico durante la generación, retornamos las rutas principales
  }

  return routes;
}
