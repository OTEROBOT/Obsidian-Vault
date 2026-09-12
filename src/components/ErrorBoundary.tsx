import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Shield } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Obsidian Vault Uncaught Error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetLocal = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090a0f] text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-panel border border-rose-500/30 rounded-3xl p-6 sm:p-8 space-y-5 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold font-display tracking-wide text-slate-100">
                VAULT RECOVERY NEXUS
              </h2>
              <p className="text-xs text-slate-400">
                An unexpected system exception occurred. The cyber vault state can be restored safely.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-rose-300 text-left overflow-x-auto max-h-32">
                <code>{this.state.error.message}</code>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all shadow-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Vault</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetLocal}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Reset Cache</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
