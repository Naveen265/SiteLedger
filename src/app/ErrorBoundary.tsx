import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * The global error boundary.
 * A rendering failure shows a message that says what happened and offers the
 * one action that helps, rather than a blank screen.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: '' };

  /** Captures the error so the next render shows the fallback. */
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  /** Logs the failure so it is available in production diagnostics. */
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SiteLedger render error', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangle className="size-7 text-status-delayed" aria-hidden />
        <h1 className="text-md font-semibold text-ink">This screen could not be displayed.</h1>
        <p className="measure text-xs text-ink-muted">
          Reload the page to try again. If it keeps happening, sign out and sign back in.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 h-10 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-white"
        >
          Reload the page
        </button>
      </div>
    );
  }
}
