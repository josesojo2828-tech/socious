import { useEffect, useState } from "react";
import { getTenantSettings } from "@/features/settings/services/settings.service";
import { planGrantsOffers } from "../lib/offer-form";

export interface OffersPlanState {
  /** Settings still loading — screens show a spinner, not a wrong answer. */
  checking: boolean;
  /** true = show the screens; false = honest "plan Avanzado" empty state. */
  allowed: boolean;
}

/**
 * Client-side entitlement gate for the offer screens (S9): OFFERS is an
 * Avanzado+ module, so GET /api/settings → planModules decides what we
 * render before any write can answer 403.
 *
 * On a settings REQUEST ERROR the gate fails open: locking here would tell
 * an Avanzado merchant something untrue ("requiere el plan Avanzado"), while
 * failing open only risks the write path — whose 403 message reaches the
 * merchant through the toast, as every screen already does.
 */
export function useOffersPlan(): OffersPlanState {
  const [checking, setChecking] = useState<boolean>(true);
  const [allowed, setAllowed] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    getTenantSettings()
      .then((settings) => {
        if (!cancelled) setAllowed(planGrantsOffers(settings.planModules));
      })
      .catch(() => {
        if (!cancelled) setAllowed(true);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { checking, allowed };
}
