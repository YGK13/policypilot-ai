"use client";

import { Component } from "react";

// ============================================================================
// ERROR BOUNDARY — Catches unhandled render errors in any child subtree.
//
// React requires class components for error boundaries (no hook equivalent).
// Renders a clean fallback UI instead of crashing the whole page.
// Used in AppShell to wrap the main content area.
// ============================================================================

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // -- Called during render when a descendant throws --
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // -- Log to console for Vercel log drains / devtools --
    console.error("[ErrorBoundary] Caught render error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { fallback } = this.props;
    if (fallback) return fallback;

    // -- Default fallback UI --
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">
          An unexpected error occurred. Refresh the page to try again. If the problem
          persists, contact your administrator.
        </p>
        <button
          onClick={() => {
            this.setState({ hasError: false, error: null });
            window.location.reload();
          }}
          className="px-5 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors"
        >
          Reload Page
        </button>
        {process.env.NODE_ENV === "development" && this.state.error && (
          <details className="mt-6 max-w-xl text-left">
            <summary className="text-xs text-gray-400 cursor-pointer mb-2">Error details (dev only)</summary>
            <pre className="text-[10px] bg-red-50 border border-red-200 text-red-700 p-3 rounded overflow-x-auto">
              {this.state.error.toString()}
            </pre>
          </details>
        )}
      </div>
    );
  }
}
