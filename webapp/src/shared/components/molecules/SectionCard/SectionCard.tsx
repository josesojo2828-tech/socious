import type { ReactNode } from "react";

/**
 * Card + row primitives shared by the settings-style screens (configuración,
 * caja, inventario...): a titled section with an icon and description, and a
 * label/control row.
 */
export function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <header className="flex items-start gap-3 mb-4">
        <span className="mt-0.5 text-indigo-600 dark:text-indigo-400">{icon}</span>
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

export function SectionRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </p>
        {hint ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
