"use client";

import { useState, useCallback } from "react";
import type { PortfolioConfig, PortfolioWidget, WidgetType, WidgetContentMap } from "@/features/portfolio/widgets/types";
import { widgetRegistry } from "@/features/portfolio/widgets/registry";
import { updatePortfolio } from "@/features/portfolio/services/portfolio.service";

const DEFAULT_PALETTE = "natural";

interface UsePortfolioEditorOptions {
  initialConfig?: PortfolioConfig | null;
}

interface UsePortfolioEditorReturn {
  config: PortfolioConfig;
  selectedIndex: number | null;
  isDirty: boolean;
  saving: boolean;
  selectedWidget: PortfolioWidget | null;
  setSelectedIndex: (index: number | null) => void;
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  updateWidgetContent: <T extends WidgetType>(id: string, content: WidgetContentMap[T]) => void;
  toggleWidgetVisibility: (id: string) => void;
  setPalette: (paletteId: string) => void;
  save: () => Promise<void>;
  cancelSelection: () => void;
  loadConfig: (config: PortfolioConfig) => void;
}

export function usePortfolioEditor({ initialConfig }: UsePortfolioEditorOptions = {}): UsePortfolioEditorReturn {
  const [config, setConfigInternal] = useState<PortfolioConfig>(
    initialConfig ?? { palette: DEFAULT_PALETTE, widgets: [] }
  );

  const loadConfig = useCallback((newConfig: PortfolioConfig) => {
    setConfigInternal(newConfig);
    setIsDirty(false);
  }, []);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedWidget = selectedIndex !== null ? config.widgets[selectedIndex] ?? null : null;

  const addWidget = useCallback((type: WidgetType) => {
    const def = widgetRegistry[type];
    const newWidget: PortfolioWidget = {
      id: crypto.randomUUID(),
      type,
      order: 0,
      visible: true,
      content: { ...def.defaultContent } as any,
    };

    setConfigInternal((prev) => {
      const widgets = [...prev.widgets, newWidget];
      return { ...prev, widgets };
    });
    setIsDirty(true);
    setSelectedIndex(config.widgets.length);
  }, [config.widgets.length]);

  const removeWidget = useCallback((id: string) => {
    setConfigInternal((prev) => {
      const widgets = prev.widgets.filter((w) => w.id !== id);
      return { ...prev, widgets };
    });
    setIsDirty(true);
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      const idx = config.widgets.findIndex((w) => w.id === id);
      if (idx === -1) return prev;
      if (prev === idx) return null;
      if (prev > idx) return prev - 1;
      return prev;
    });
  }, [config.widgets]);

  const reorderWidgets = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setConfigInternal((prev) => {
      const widgets = [...prev.widgets];
      const [moved] = widgets.splice(fromIndex, 1);
      widgets.splice(toIndex, 0, moved);
      return { ...prev, widgets };
    });
    setIsDirty(true);
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      if (prev === fromIndex) return toIndex;
      if (fromIndex < prev && toIndex >= prev) return prev - 1;
      if (fromIndex > prev && toIndex <= prev) return prev + 1;
      return prev;
    });
  }, []);

  const updateWidgetContent = useCallback(<T extends WidgetType>(id: string, content: WidgetContentMap[T]) => {
    setConfigInternal((prev) => {
      const widgets = prev.widgets.map((w) =>
        w.id === id ? { ...w, content: content as any } : w
      );
      return { ...prev, widgets };
    });
    setIsDirty(true);
  }, []);

  const toggleWidgetVisibility = useCallback((id: string) => {
    setConfigInternal((prev) => {
      const widgets = prev.widgets.map((w) =>
        w.id === id ? { ...w, visible: !w.visible } : w
      );
      return { ...prev, widgets };
    });
    setIsDirty(true);
  }, []);

  const setPalette = useCallback((paletteId: string) => {
    setConfigInternal((prev) => ({ ...prev, palette: paletteId }));
    setIsDirty(true);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const ordered = config.widgets.map((w, i) => ({ ...w, order: i }));
      await updatePortfolio({ config: { palette: config.palette, widgets: ordered } } as any);
      setIsDirty(false);
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  }, [config]);

  const cancelSelection = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  return {
    config,
    selectedIndex,
    isDirty,
    saving,
    selectedWidget,
    setSelectedIndex,
    addWidget,
    removeWidget,
    reorderWidgets,
    updateWidgetContent,
    toggleWidgetVisibility,
    setPalette,
    save,
    cancelSelection,
    loadConfig,
  };
}
