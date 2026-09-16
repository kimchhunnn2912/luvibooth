import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Luvibooth crashed:', error, info)
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
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
