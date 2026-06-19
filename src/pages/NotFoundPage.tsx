import { Link } from 'react-router-dom'

import { PATHS } from '@/routes/paths'
import { cn } from '@/lib/utils/cn'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 text-center">
      <p className="font-data text-6xl text-text-faint">404</p>
      <h1 className="text-2xl text-text">Page not found</h1>
      <p className="text-sm text-text-muted">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        to={PATHS.home}
        className={cn(
          'mt-2 inline-flex h-10 items-center justify-center rounded px-4 text-sm font-medium',
          'border border-border bg-surface-overlay text-text hover:bg-surface-raised',
          'transition-colors'
        )}
      >
        Back to Timer
      </Link>
    </div>
  )
}
