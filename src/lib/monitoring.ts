import * as Sentry from '@sentry/react'
import type { QueryKey } from '@tanstack/react-query'

let monitoringEnabled = false

export function initMonitoring(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!import.meta.env.PROD || !dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      delete event.user
      delete event.request
      delete event.breadcrumbs
      return event
    },
  })
  monitoringEnabled = true
}

function queryFamily(queryKey: QueryKey | undefined): string {
  const family = queryKey?.[0]
  return typeof family === 'string' ? family : 'unknown'
}

export function captureQueryError(error: Error, queryKey: QueryKey): void {
  if (!monitoringEnabled) return
  Sentry.captureException(error, {
    tags: {
      operation: 'query',
      query_family: queryFamily(queryKey),
    },
    extra: {
      query_key_depth: queryKey.length,
    },
  })
}

export function captureMutationError(error: Error, mutationKey: QueryKey | undefined): void {
  if (!monitoringEnabled) return
  Sentry.captureException(error, {
    tags: {
      operation: 'mutation',
      query_family: queryFamily(mutationKey),
    },
    extra: {
      query_key_depth: mutationKey?.length ?? 0,
    },
  })
}

export function captureBoundaryError(
  error: Error,
  componentStack: string | null | undefined,
): void {
  if (!monitoringEnabled) return
  Sentry.captureException(error, {
    tags: { operation: 'react_boundary' },
    contexts: {
      react: {
        componentStack: componentStack ?? 'Unavailable',
      },
    },
  })
}
