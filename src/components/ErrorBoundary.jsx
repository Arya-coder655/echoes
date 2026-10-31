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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.handleReset, this.state.error);
      }
      return (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: '#f87171' }}>
          <p style={{ marginBottom: 12 }}>An unexpected error occurred in this section.</p>
          <button 
            type="button" 
            onClick={this.handleReset}
            style={{ padding: '8px 16px', background: '#fc2904', color: '#fff', border: 'none', borderRadius: 20, cursor: 'pointer' }}
          >
            Reset
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
