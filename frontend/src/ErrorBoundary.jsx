import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            hasError: true,
            error: error,
            errorInfo: errorInfo
        });

        const errorData = `Error: ${error.toString()}\n\nStack:\n${errorInfo.componentStack}`;

        // Log to console
        console.error(error, errorInfo);

        // Send to our local node server
        fetch('http://localhost:4000', {
            method: 'POST',
            body: errorData
        }).catch(e => console.error("Failed to send error logic", e));
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: 'red', background: '#fee' }}>
                    <h2>Something went wrong (Frontend Crash)</h2>
                    <details style={{ whiteSpace: 'pre-wrap' }}>
                        <summary>Click for error details</summary>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
