import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="apple-glass max-w-md rounded-[24px] p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/14 text-rose-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
              AlphaPanda Studio recovered from an error
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.history.replaceState({}, '', window.location.pathname);
                window.location.reload();
              }}
              className="apple-button-primary mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2 text-[13px] font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
