import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log the error to an error reporting service
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Call the optional onError callback
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="flex justify-center">
                            <AlertTriangle className="h-16 w-16 text-destructive" />
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-foreground">
                                Something went wrong
                            </h1>
                            <p className="text-muted-foreground">
                                We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
                            </p>
                        </div>

                        {import.meta.env.DEV && this.state.error && (
                            <details className="text-left bg-muted p-4 rounded-lg text-sm">
                                <summary className="cursor-pointer font-medium mb-2">
                                    Error Details (Development Only)
                                </summary>
                                <pre className="whitespace-pre-wrap text-xs text-destructive">
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}

                        <div className="flex gap-3 justify-center">
                            <Button onClick={this.handleRetry} className="flex items-center gap-2">
                                <RefreshCw size={16} />
                                Try Again
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => window.location.reload()}
                            >
                                Refresh Page
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
