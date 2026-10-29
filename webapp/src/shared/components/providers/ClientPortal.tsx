"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

/**
 * Renders `children` into `document.body` via a portal, client-only.
 *
 * SSR and the hydration pass both see `getServerMounted() === false`, so the
 * DOM always matches; after hydration React re-reads the client snapshot and
 * the portal mounts. The subtree becomes a separate React container:
 * reconciliations of the portal children never touch (or are touched by) the
 * route-commit parent they are declared in.
 */
export function ClientPortal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientMounted,
    getServerMounted
  );

  if (!mounted) return null;

  return createPortal(children, document.body);
}
