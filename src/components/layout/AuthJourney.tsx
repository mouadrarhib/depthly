export function AuthJourney() {
  return (
    <div className="auth-journey mt-10 border-t border-white/20 pt-5" aria-label="Focus, track, reflect">
      <svg
        viewBox="0 0 560 36"
        preserveAspectRatio="none"
        className="h-9 w-full overflow-visible"
        aria-hidden="true"
      >
        <path d="M 10 18 H 550" stroke="currentColor" strokeWidth="1" className="text-white/25" />
        <path
          d="M 10 18 H 550"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="auth-journey-line text-brand"
        />
        {[10, 280, 550].map((x, index) => (
          <g key={x} className="auth-journey-node" style={{ animationDelay: `${0.45 + index * 0.32}s` }}>
            <circle cx={x} cy="18" r="7" fill="currentColor" className="text-depth-bg" />
            <circle cx={x} cy="18" r="5" fill="currentColor" className="text-brand" />
            <circle cx={x} cy="18" r="1.5" fill="currentColor" className="text-ink-primary" />
          </g>
        ))}
      </svg>
      <div className="mt-1 grid grid-cols-3 text-sm font-medium text-ink-primary/85">
        <span>Focus</span>
        <span className="text-center">Track</span>
        <span className="text-right">Reflect</span>
      </div>
    </div>
  )
}
