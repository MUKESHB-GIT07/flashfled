import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn(`[ErrorBoundary caught error in ${this.props.name || 'Component'}]:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '16px 20px',
          margin: '12px 0',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '8px',
          color: '#f87171',
          fontSize: '0.85rem',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            ⚠️ {this.props.name || 'Section'} Temporarily Unavailable
          </div>
          <div style={{ opacity: 0.8, fontSize: '0.78rem' }}>
            This panel encountered a runtime issue, but the main dashboard remains fully operational.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
