"use client";

import { useParams } from "next/navigation";
import { ClientForm } from "@/features/clients/components/ClientForm";

/** Dedicated edit route (S1): prefilled from GET /api/clients/:id. */
export default function EditClientPage() {
  const params = useParams();
  const clientId = params?.id as string | undefined;

  if (!clientId) return null;
  return <ClientForm clientId={clientId} />;
}
