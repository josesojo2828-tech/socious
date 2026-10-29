"use client";

import NutritionalPlanDetailPage from "@/features/nutringest/patient/page/NutritionalPlanDetailPage";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function NutritionalPlanFormPage() {
    const params = useParams(); 
    return <NutritionalPlanDetailPage params={{ id: `${params.id}` }} />;
}