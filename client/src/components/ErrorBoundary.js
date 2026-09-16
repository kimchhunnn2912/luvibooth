import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, componentStack: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Luvibooth crashed:', error, info)
    this.setState({ componentStack: info.componentStack })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white px-6">
          <div className="max-w-sm text-center">
            <h1 className="text-xl font-bold text-dark">Something went wrong</h1>
            <p className="mt-2 text-sm text-gray-500">
              Please reload the page. If it keeps happening, let us know what you were doing.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-pink-primary text-white font-semibold px-6 py-3 hover:opacity-90 transition"
            >
              Reload
            </button>
            <pre className="mt-6 text-left text-[11px] leading-snug text-gray-500 whitespace-pre-wrap break-words bg-gray-50 rounded-lg p-3 font-semibold">
              {String(this.state.error?.name || 'Error')}: {String(this.state.error?.message || this.state.error)}
            </pre>
            {this.state.componentStack && (
              <pre className="mt-2 text-left text-[10px] leading-snug text-gray-400 whitespace-pre-wrap break-words bg-gray-50 rounded-lg p-3">
                {this.state.componentStack}
              </pre>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
