import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

type Props = {
  children: ReactNode;
  /** Reset the boundary when this changes (e.g. the route). */ resetKey?: string;
};
type State = { error: Error | null };

/**
 * Catches render errors in a page so a bug (or a stale app instance) shows a
 * message with a reload action instead of an empty screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ui] page crashed', error, info.componentStack);
  }

  override componentDidUpdate(prev: Props): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    const stale =
      /No handler registered|Cannot read properties of undefined|is not a function/.test(
        this.state.error.message,
      );
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-lg border border-danger/40 bg-danger/5 p-5 text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-danger" /> This page hit an error
          </div>
          <p className="mt-2 text-fg-muted">
            {stale
              ? 'The running app is older than the code it loaded. Quit and reopen the app (or restart the dev server) and try again.'
              : 'Something went wrong while drawing this page. Your project is saved; reloading usually fixes it.'}
          </p>
          <pre className="mt-3 max-h-32 overflow-auto rounded bg-surface-2 p-2 text-[11px] text-fg-subtle">
            {this.state.error.message}
          </pre>
          <div className="mt-3 flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                typeof location !== 'undefined' ? location.reload() : this.setState({ error: null })
              }
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reload
            </Button>
            <Button size="sm" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
