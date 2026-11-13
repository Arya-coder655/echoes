import React from 'react';

/**
 * Modern Minimal Pure Black Error Screen
 * Features: Pure black (#000000) background, prominent app logo with a subtle
 * crimson/amber ambient glow, clean white typography, and smooth restore actions.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Echoes Sanctuary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = window.location.pathname;
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.handleReset, this.state.error);
      }

      return (
        <div className="echoes-error-screen" role="alert" aria-live="assertive">
          <div className="error-ambient-glow" />

          <div className="error-content-card">
            {/* Prominently Displayed App Logo with Subtle Ember Glow */}
            <div className="error-logo-wrap">
              <div className="error-logo-pulse" />
              <div className="error-logo-frame">
                <img 
                  src={`${import.meta.env.BASE_URL}pwa-192x192.png`} 
                  alt="Echoes Logo" 
                  className="error-logo-img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `${import.meta.env.BASE_URL}brand-art.jpg`;
                  }}
                />
              </div>
            </div>

            {/* Clean White Typography */}
            <div className="error-badge">
              <span className="error-badge-dot" />
              <span>Sanctuary Notice</span>
            </div>

            <h1 className="error-title">Something Whispered in the Dark</h1>
            
            <p className="error-description">
              A momentary glitch occurred in the stream. Take a gentle breath—your unspoken 
              thoughts and confessions remain entirely safe and anonymous.
            </p>

            {/* Smooth Modern Action Buttons */}
            <div className="error-actions-group">
              <button 
                type="button" 
                onClick={this.handleReset}
                className="error-primary-btn"
              >
                <span>Restore Sanctuary</span>
              </button>

              <button 
                type="button" 
                onClick={this.handleGoHome}
                className="error-secondary-btn"
              >
                <span>Return to Home</span>
              </button>
            </div>

            {/* Subtle Diagnostic Toggle */}
            {this.state.error && (
              <div className="error-details-wrap">
                <button 
                  type="button" 
                  onClick={this.toggleDetails}
                  className="error-details-toggle"
                >
                  {this.state.showDetails ? 'Hide details' : 'Diagnostic info'}
                </button>
                {this.state.showDetails && (
                  <pre className="error-details-pre">
                    {this.state.error?.toString() || 'Unknown error'}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
