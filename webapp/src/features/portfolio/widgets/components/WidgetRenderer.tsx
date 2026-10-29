import { getPaletteOrDefault } from "../palettes";
import { widgetRegistry } from "../registry";
import type { PortfolioConfig } from "../types";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import { Logo } from "@/shared/components/atoms/Logo";

interface WidgetRendererProps {
  config: PortfolioConfig;
}

export function WidgetRenderer({ config }: WidgetRendererProps) {
  const palette = getPaletteOrDefault(config.palette);

  const visibleWidgets = config.widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order);

  if (visibleWidgets.length === 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-8"
        style={{ backgroundColor: palette.colors.background, color: palette.colors.text }}
      >
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2" style={{ color: palette.colors.primary }}>
            Portafolio en construcción
          </h2>
          <p className="text-lg opacity-70">
            Este nutricionista aún no ha configurado su portafolio.
          </p>
        </div>
      </div>
    );
  }

  const cssVars = {
    "--p-primary": palette.colors.primary,
    "--p-secondary": palette.colors.secondary,
    "--p-accent": palette.colors.accent,
    "--p-bg": palette.colors.background,
    "--p-text": palette.colors.text,
  } as React.CSSProperties;

  return (
    <div data-palette={palette.id} style={cssVars} className="bg-slate-50/50 min-h-screen flex flex-col justify-between selection:bg-[var(--p-primary)]/20">
      <main className="w-full max-w-xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6">
        {visibleWidgets.map((widget) => {
          const def = widgetRegistry[widget.type];
          const Component = def.component;

          return (
            <WidgetErrorBoundary key={widget.id} widgetLabel={def.label}>
              <Component
                content={widget.content as any}
                palette={palette}
              />
            </WidgetErrorBoundary>
          );
        })}
      </main>

      {/* Nutringest Editorial Footer */}
      <footer className="py-8 border-t border-slate-200/60 bg-white/80 backdrop-blur-md text-center mt-12">
        <div className="max-w-xl mx-auto px-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">CONECTE-SE</span>
          </div>
          <div className="h-0.5 w-8 bg-slate-200 rounded-full my-1" />
          <Logo variant="full" color="blue" size="lg" className="h-6 w-auto" />
          <p className="text-xs text-slate-400 font-medium mt-1">
            © {new Date().getFullYear()} Nutringest Pro. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
