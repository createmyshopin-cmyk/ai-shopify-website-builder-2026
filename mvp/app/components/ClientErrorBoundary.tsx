import { Component, type ErrorInfo, type ReactNode } from "react";

interface ClientErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ClientErrorBoundaryState {
  error: Error | null;
}

export class ClientErrorBoundary extends Component<
  ClientErrorBoundaryProps,
  ClientErrorBoundaryState
> {
  state: ClientErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ClientErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ClientErrorBoundary]", error, info.componentStack);
    this.props.onError?.(error, info);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <s-section heading="Something went wrong">
          <s-banner tone="critical">
            {this.state.error.message ||
              "An unexpected error occurred while rendering this section."}
          </s-banner>
          <s-stack direction="inline" gap="base">
            <s-button onClick={this.handleRetry}>Try again</s-button>
          </s-stack>
        </s-section>
      );
    }

    return this.props.children;
  }
}
