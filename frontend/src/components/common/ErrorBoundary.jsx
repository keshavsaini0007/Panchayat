import { Component } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            {this.state.error?.message || "An unexpected error occurred. Please try again."}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              <Home className="mr-2 h-4 w-4" /> Go Home
            </Button>
            <Button onClick={this.handleReset}>
              <RefreshCw className="mr-2 h-4 w-4" /> Try Again
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
