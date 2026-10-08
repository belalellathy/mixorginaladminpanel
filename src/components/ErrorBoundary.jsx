import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-dvh text-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Something went wrong</h2>
            <p className="text-gray-500 mt-2">Please refresh the page or contact support.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Refresh
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
