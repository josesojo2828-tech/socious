"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/shared/store/auth/useAuthStore";
import SubscriptionPage from "@/features/user/components/pages/SubscriptionPage";

export default function AppSubscriptionPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isPatient = user?.permits?.name === "PATIENT";

  useEffect(() => {
    if (isPatient) {
      router.replace("/dashboard");
    }
  }, [isPatient, router]);

  if (isPatient) {
    return null;
  }

  return (<SubscriptionPage />);
}