import { StrictMode } from 'react'

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRoot } from 'react-dom/client'

import { captureMutationError, captureQueryError, initMonitoring } from '@/lib/monitoring'

import App from './App'
import '@/styles/globals.css'

initMonitoring()

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => captureQueryError(error, query.queryKey),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) =>
      captureMutationError(error, mutation.options.mutationKey),
  }),
  defaultOptions: {
    queries: {
      // Data is considered fresh for 60 seconds — won't refetch on every mount
      staleTime: 60 * 1000,
      // Show stale data while refetching in background (no loading flash)
      refetchOnWindowFocus: true,
      // Retry failed requests once before showing an error
      retry: 1,
    },
  },
})

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found in index.html')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Only renders in development — zero production cost */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
)
