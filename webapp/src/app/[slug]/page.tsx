"use client";

import { useParams } from "next/navigation";
import { PublicStorefront } from "@/features/checkout/components/PublicStorefront";

/** Public storefront at the root: `dominio.com/<username>`. */
export default function StorefrontPage() {
  const params = useParams<{ slug: string }>();
  return <PublicStorefront slug={params?.slug ?? ""} />;
}
