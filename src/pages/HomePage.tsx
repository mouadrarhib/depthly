/**
 * HomePage — Depthly's Timer page lives at the root route ("/").
 * Replace this with the real timer once you build it.
 *
 * Pattern to follow:
 *   1. Call your React Query hooks to load data
 *   2. Compose domain components to display it
 *   3. Keep page files thin — no business logic here
 */
export function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl text-text">Work at depth.</h1>
        <p className="mt-1 text-sm text-text-muted">
          Your timer will live here.
        </p>
      </div>

      {/* TimerDisplay, TimerControls, etc. go here once built */}
    </div>
  )
}
