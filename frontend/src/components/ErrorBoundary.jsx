import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // You can also log the error to an external service here
    console.error('ErrorBoundary caught error:', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <h2>Đã xảy ra lỗi</h2>
          <p>{this.state.error?.message || 'Lỗi không xác định'}</p>
          {this.state.info?.componentStack && (
            <details style={{ whiteSpace: 'pre-wrap' }}>
              {this.state.info.componentStack}
            </details>
          )}
          <div style={{ marginTop: 12 }}>
            <button onClick={() => window.location.reload()}>Tải lại</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
