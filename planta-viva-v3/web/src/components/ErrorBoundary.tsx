// src/components/ErrorBoundary.tsx
'use client';
import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[CRASH-REACT]', error.message, info.componentStack?.slice(0, 200));
  }

  render() {
    if (this.state.error) {
      return (
        <div className="w-screen h-screen bg-[#101820] text-white p-8 font-mono text-sm flex flex-col items-center justify-center">
          <h1 className="text-red-400 text-xl mb-4">⛔ La interfaz tuvo un error</h1>
          <p className="text-red-200 mb-2 max-w-lg text-center">{this.state.error.message}</p>
          <p className="text-slate-400 mb-6 text-center">El error quedó registrado. Intenta recargar la página.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white">
            ↻ Recargar app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}