import React from 'react'
import { AlertCircle } from 'lucide-react'

interface Props {
  children:  React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error:    Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          minHeight:      300,
          padding:        32,
          textAlign:      'center',
        }}>
          <AlertCircle size={40} style={{ color: '#F25C5C' }} />
          <div style={{ fontSize: 16, fontWeight: 500, color: '#E8E6F0', marginTop: 16 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, color: '#7A7890', marginTop: 8 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop:    20,
              padding:      '8px 16px',
              background:   '#4B9EFF',
              color:        'white',
              border:       'none',
              borderRadius: 8,
              fontSize:     13,
              cursor:       'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
