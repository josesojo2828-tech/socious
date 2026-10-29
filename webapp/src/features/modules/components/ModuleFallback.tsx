'use client';

import { Puzzle } from 'lucide-react';

interface ModuleFallbackProps {
  /** Stable module key with no registered dashboard (optional). */
  moduleKey?: string;
  message?: string;
}

/**
 * Rendered by `ModuleDashboardHost` when no dashboard component is registered
 * for a module key (the 12 business modules register their own components).
 */
export function ModuleFallback({ moduleKey, message }: ModuleFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <div className="w-14 h-14 rounded-full bg-base-200 flex items-center justify-center text-base-content/40">
        <Puzzle size={26} />
      </div>
      <div>
        <h2 className="text-lg font-bold text-base-content">
          Panel no disponible
        </h2>
        <p className="text-sm text-base-content/60 mt-1 max-w-md">
          {message ??
            'Este módulo todavía no tiene un panel registrado en el frontend.'}
        </p>
        {moduleKey && (
          <p className="font-mono text-[11px] text-base-content/40 mt-2">
            {moduleKey}
          </p>
        )}
      </div>
    </div>
  );
}
