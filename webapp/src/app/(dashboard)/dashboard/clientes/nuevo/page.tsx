"use client";

import { ClientForm } from "@/features/clients/components/ClientForm";

/** Dedicated create route (S1): the list no longer hosts the form. */
export default function NewClientPage() {
  return <ClientForm />;
}
