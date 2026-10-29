"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorWithComponentStack = Error & { componentStack?: string };

interface Props {
  children: ReactNode;
}

interface State {
  error: ErrorWithComponentStack | null;
}

/**
 * Transparent error boundary that captures React's `componentStack` and
 * re-throws so the error keeps bubbling to the nearest ancestor boundary
 * that owns the user-facing fallback (root `app/error.tsx`, which is also
 * the single reporting path).
 *
 * MUST sit between the throwing subtree and `app/error.tsx` — React always
 * delivers an error to the NEAREST boundary, so a boundary rendered above
 * `error.tsx` would never see it. Placed in `(dashboard)/layout.tsx` the
 * order is: page → ComponentStackBoundary → app/error.tsx boundary.
 *
 * Rethrow-from-render is safe here: React treats an error thrown by a
 * boundary's own render as an error of the boundary's PARENT, so it is
 * delivered to the next boundary up (error.tsx), never back to this one —
 * no loop. The same error instance arrives at `error.tsx`, now enriched
 * with `componentStack` for the Telegram alert.
 */
export class ComponentStackBoundary extends Component<Props, State> {
  public state: State = { error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    if (!info.componentStack) return;
    try {
      (error as ErrorWithComponentStack).componentStack = info.componentStack;
    } catch {
      // Frozen/sealed error objects: enrichment skipped, alert still sent.
    }
  }

  public render() {
    if (this.state.error) {
      throw this.state.error;
    }
    return this.props.children;
  }
}
