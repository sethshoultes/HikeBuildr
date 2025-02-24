import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  FallbackComponent: React.ComponentType<{ error: Error }>;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  public componentDidCatch(error: Error) {
    console.error("Uncaught error:", error);
  }

  public render() {
    const { error } = this.state;
    const { FallbackComponent, children } = this.props;

    if (error) {
      return <FallbackComponent error={error} />;
    }

    return children;
  }
}
