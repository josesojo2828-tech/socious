import { PortfolioTemplate, PortfolioNotFound } from "@/features/portfolio/components/PortfolioTemplate";
import type { PortfolioPublic } from "@/types/backend/portfolio.interface";

const SSR_HOST = process.env.INTERNAL_API_URL || "http://localhost:3001";

async function fetchPortfolio(usernameParam: string): Promise<PortfolioPublic | null> {
  try {
    const cleanUsername = usernameParam.startsWith("@")
      ? usernameParam.substring(1)
      : usernameParam;
    const res = await fetch(`${SSR_HOST}/api/portfolio/public/@${cleanUsername}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props) {
  try {
    const { username } = await params;
    const portfolio = await fetchPortfolio(username);
    if (!portfolio) throw new Error("Not found");

    const title = `${portfolio.fullName} - Nutringest`;
    const description =
      portfolio.bio || `Portafolio digital de ${portfolio.fullName} - Nutricionista en Nutringest`;
    const ogImage = portfolio.photoUrl || portfolio.avatarUrl;

    return {
      title,
      description,
      openGraph: {
        title: `${portfolio.fullName} - Nutricionista en Nutringest`,
        description,
        images: ogImage ? [{ url: ogImage }] : [],
      },
    };
  } catch {
    return {
      title: "Portafolio no encontrado - Nutringest",
    };
  }
}

export default async function PortfolioPublicPage({ params }: Props) {
  const { username } = await params;
  const portfolio = await fetchPortfolio(username);

  if (!portfolio) {
    return <PortfolioNotFound />;
  }

  return <PortfolioTemplate portfolio={portfolio} />;
}
