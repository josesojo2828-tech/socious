"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  widgetLabel?: string;
}

interface State {
  hasError: boolean;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full py-8 px-4 text-center bg-red-50 border-y border-red-200">
          <p className="text-sm text-red-600 font-medium">
            ⚠️ No se pudo mostrar esta sección
          </p>
          {this.props.widgetLabel && (
            <p className="text-xs text-red-400 mt-1">{this.props.widgetLabel}</p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
