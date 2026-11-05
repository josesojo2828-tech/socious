"use client";

import { useParams } from "next/navigation";
import { PublicStorefront } from "@/features/checkout/components/PublicStorefront";

/**
 * Legacy storefront path. The canonical URL is now `/<slug>`; this route keeps
 * old links and QR codes working with the exact same experience.
 */
export default function ShopPage() {
  const params = useParams<{ slug: string }>();
  return <PublicStorefront slug={params?.slug ?? ""} />;
}
