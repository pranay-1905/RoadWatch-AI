import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RoadWatch AI — Uncaught Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          padding: '40px 20px',
          fontFamily: "'Inter', system-ui, sans-serif",
          textAlign: 'center'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '48px 40px',
            boxShadow: '0 4px 6px -1px rgba(15,23,42,0.08)',
            border: '1px solid #e2e8f0',
            maxWidth: '480px',
            width: '100%'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ color: '#0f172a', fontSize: '22px', margin: '0 0 8px' }}>
              Something went wrong
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px', lineHeight: '1.6' }}>
              An unexpected error occurred in the RoadWatch AI Dashboard. 
              Please reload the page to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 28px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#4338ca'}
              onMouseLeave={(e) => e.target.style.background = '#4f46e5'}
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
