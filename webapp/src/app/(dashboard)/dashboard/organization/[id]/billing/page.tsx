"use client";

import { useParams } from "next/navigation";
import { ClinicBillingPage } from "@/features/nutringest/clinic/pages/ClinicBillingPage";

export default function OrganizationBillingPage() {
  const params = useParams();
  const orgId = params?.id as string;

  if (!orgId) {
    return (
      <div className="flex items-center justify-center min-h-[450px] text-slate-400">
        <p>ID de organización no válido</p>
      </div>
    );
  }

  return <ClinicBillingPage orgId={orgId} />;
}