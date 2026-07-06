import type { ReactNode } from 'react'

import { SectionHeader, sectionPad } from './primitives'

interface FeatureSectionProps {
  eyebrow: string
  title: string
  subtext: string
  /** Which side the mockup sits on at desktop widths. */
  mockupSide: 'left' | 'right'
  mockup: ReactNode
  /** Stacked FeatureBlock elements. */
  children: ReactNode
}

/**
 * Alternating detail section: centered header, then mockup + feature blocks
 * in a ~55/45 split. On mobile both stack to one column with the mockup
 * always on top (mockup is first in DOM; desktop side is controlled by
 * flex-row vs flex-row-reverse).
 */
export function FeatureSection({
  eyebrow,
  title,
  subtext,
  mockupSide,
  mockup,
  children,
}: FeatureSectionProps) {
  const rowClass = mockupSide === 'left' ? 'md:flex-row' : 'md:flex-row-reverse'

  return (
    <section data-reveal-group className="px-5 md:px-8" style={sectionPad}>
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        <SectionHeader eyebrow={eyebrow} title={title} subtext={subtext} />

        <div
          className={`flex flex-col items-center gap-12 md:items-center md:gap-16 ${rowClass}`}
          style={{ marginTop: 56 }}
        >
          {/* Mockup — first in DOM so it stacks on top on mobile */}
          <div data-reveal className="w-full md:w-[55%]">
            {mockup}
          </div>

          <div className="flex w-full flex-col gap-8 md:w-[45%]">{children}</div>
        </div>
      </div>
    </section>
  )
}
