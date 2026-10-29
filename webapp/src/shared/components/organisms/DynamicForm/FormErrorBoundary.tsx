import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class FormErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Actualiza el estado para que el siguiente renderizado muestre la interfaz de repuesto.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error inside Dynamic Form:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-6 my-4 border border-error/20 bg-error/5 rounded-2xl shadow-sm text-center">
          <div className="flex justify-center mb-3 text-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-error mb-2">Error al cargar el formulario</h3>
          <p className="text-sm text-base-content/75 max-w-md mx-auto mb-4">
            El esquema del formulario enviado por el servidor contiene datos corruptos o incompatibles.
          </p>
          {this.state.error && (
            <div className="text-left bg-base-300/50 p-3 rounded-lg text-xs font-mono text-base-content overflow-x-auto max-h-32 mb-4">
              {this.state.error.toString()}
            </div>
          )}
          <button 
            type="button" 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn btn-outline btn-error btn-sm rounded-xl"
          >
            Reintentar renderizado
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
