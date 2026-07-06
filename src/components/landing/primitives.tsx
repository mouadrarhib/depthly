import type { CSSProperties, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/** Small uppercase section label. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: '#7A7890',
      }}
    >
      {children}
    </p>
  )
}

interface SectionHeaderProps {
  eyebrow: string
  title: string
  subtext: string
  align?: 'center' | 'left'
}

/** Eyebrow → H2 → one-line subtext, used at the top of every section. */
export function SectionHeader({ eyebrow, title, subtext, align = 'center' }: SectionHeaderProps) {
  const centered = align === 'center'
  return (
    <div
      className="flex flex-col gap-3"
      style={{
        alignItems: centered ? 'center' : 'flex-start',
        textAlign: centered ? 'center' : 'left',
        maxWidth: centered ? 620 : 520,
        margin: centered ? '0 auto' : undefined,
      }}
    >
      <span data-reveal>
        <Eyebrow>{eyebrow}</Eyebrow>
      </span>
      <h2
        data-reveal
        style={{
          fontSize: 'clamp(26px, 4vw, 36px)',
          fontWeight: 500,
          letterSpacing: '-0.03em',
          color: '#E8E6F0',
          lineHeight: 1.15,
        }}
      >
        {title}
      </h2>
      <p data-reveal style={{ fontSize: 15, color: '#7A7890', lineHeight: 1.6 }}>
        {subtext}
      </p>
    </div>
  )
}

interface FeatureBlockProps {
  Icon: LucideIcon
  title: string
  description: string
  /** Icon color — defaults to muted; pass #C8FF64 only for explicit streak references. */
  iconColor?: string
}

/** Icon in a rounded square + bold title + 2-line muted description. */
export function FeatureBlock({ Icon, title, description, iconColor = '#7A7890' }: FeatureBlockProps) {
  return (
    <div data-reveal className="flex items-start gap-4">
      <span
        className="flex shrink-0 items-center justify-center"
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: '#222228',
          border: '1px solid #2E2E38',
        }}
      >
        <Icon size={18} style={{ color: iconColor }} strokeWidth={1.75} />
      </span>
      <div className="flex flex-col gap-1.5">
        <h3 style={{ fontSize: 16, fontWeight: 500, color: '#E8E6F0', letterSpacing: '-0.01em' }}>
          {title}
        </h3>
        <p style={{ fontSize: 14, color: '#7A7890', lineHeight: 1.6 }}>{description}</p>
      </div>
    </div>
  )
}

export const sectionPad: CSSProperties = {
  paddingTop: '5.5rem',
  paddingBottom: '5.5rem',
}
