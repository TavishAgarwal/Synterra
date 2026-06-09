import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Synthetic Nation error:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0a0c10',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 560, border: '1px solid #ff0055', background: '#16070c', padding: 28 }}>
          <div style={{ fontFamily: 'var(--font-data)', color: '#ff0055', fontSize: 11, marginBottom: 12 }}>
            SYSTEM ERROR
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 12 }}>
            Something broke in the walkthrough.
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{this.state.message}</p>
          <button
            className="chamfered"
            onClick={() => window.location.assign('/')}
            style={{ marginTop: 20, background: '#00e5ff', border: 0, padding: '12px 20px' }}
          >
            Restart
          </button>
        </div>
      </div>
    );
  }
}
