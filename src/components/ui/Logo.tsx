import { cn } from '@/lib/utils/cn'

interface LogoProps {
  /** Pixel size of the icon (rings + dot). Default 24. */
  size?: number
  /** Show the "depthly" wordmark next to the icon. */
  withWordmark?: boolean
  className?: string
}

/**
 * The Depthly mark — three concentric rings converging on a single
 * brand-blue dot. Reads as sonar depth / a focus point being found.
 * The dot is the only colored element; everything else inherits currentColor.
 *
 * Per brand spec:
 *   - Ring ratios: 100% / 67% / 35% of outer radius
 *   - Ring opacities: 1.0 → 0.45 → 0.20
 *   - Stroke weight: 1.25px at all sizes
 *   - Below 16px, the innermost ring should be dropped for legibility
 *     (not implemented here — use the bare 2-ring version manually
 *     for favicon-scale contexts; see brand doc for exact markup)
 *
 * Usage:
 *   <Logo />                          // icon only, 24px, currentColor rings
 *   <Logo size={32} withWordmark />   // full lockup for nav/sidebar
 */
export function Logo({ size = 24, withWordmark = false, className }: LogoProps) {
  const r = size / 2
  const dotColor = 'var(--color-brand)'

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        aria-hidden="true"
      >
        <circle cx={r} cy={r} r={r * 0.92} stroke="currentColor" strokeWidth={1.25} fill="none" />
        <circle cx={r} cy={r} r={r * 0.6} stroke="currentColor" strokeWidth={1.25} fill="none" opacity={0.45} />
        <circle cx={r} cy={r} r={r * 0.31} stroke="currentColor" strokeWidth={1.25} fill="none" opacity={0.2} />
        <circle cx={r} cy={r} r={r * 0.12} fill={dotColor} />
      </svg>

      {withWordmark ? (
        <span
          className="text-text font-medium"
          style={{ fontSize: size * 0.65, letterSpacing: '-0.05em' }}
        >
          Depthly
        </span>
      ) : null}
    </span>
  )
}
