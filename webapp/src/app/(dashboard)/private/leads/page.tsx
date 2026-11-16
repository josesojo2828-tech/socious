import type { Metadata } from "next";
import { LeadsBoard } from "@/features/leads/components/LeadsBoard";

export const metadata: Metadata = {
  title: "Leads · San Juan de los Morros",
  robots: { index: false, follow: false },
};

export default function PrivateLeadsPage() {
  return <LeadsBoard />;
}
