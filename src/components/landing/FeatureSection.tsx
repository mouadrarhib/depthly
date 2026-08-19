import type { ReactNode } from 'react'

import { SectionHeader, sectionPad } from './primitives'

interface FeatureSectionProps {
  /** Centered header above the mockup row. Omit together with `title`/`subtext` in favor of `heading`/`body`. */
  eyebrow?: string
  title?: string
  subtext?: string
  /** Headline + body rendered left-aligned in the text column instead of the centered header. */
  heading?: string
  body?: string
  /** Which side the mockup sits on at desktop widths. */
  mockupSide: 'left' | 'right'
  mockup: ReactNode
  /** Stacked FeatureBlock elements. */
  children: ReactNode
  /** Fit this row into the desktop viewport below the 64px landing nav. */
  viewportFit?: boolean
  /** Tighten and rebalance the inline heading/body/feature rhythm. */
  compactCopy?: boolean
  /** Optional body color override for a single section. */
  bodyColor?: string
}

/**
 * Alternating detail section: mockup + feature blocks in a ~55/45 split,
 * with either a centered header above the row (eyebrow/title/subtext) or a
 * left-aligned heading/body inline in the text column. On mobile both stack
 * to one column with the mockup always on top (mockup is first in DOM;
 * desktop side is controlled by flex-row vs flex-row-reverse).
 *
 * By default, section height is content-driven and uses the shared
 * `sectionPad`. A viewport-fitted section keeps that mobile spacing, then
 * fills the desktop viewport below the landing nav with height-aware padding.
 */
export function FeatureSection({
  eyebrow,
  title,
  subtext,
  heading,
  body,
  mockupSide,
  mockup,
  children,
  viewportFit = false,
  compactCopy = false,
  bodyColor = '#7A7890',
}: FeatureSectionProps) {
  const rowClass = mockupSide === 'left' ? 'md:flex-row' : 'md:flex-row-reverse'
  const hasCenteredHeader = Boolean(eyebrow && title && subtext)

  return (
    <section
      data-reveal-group
      data-viewport-fit={viewportFit || undefined}
      className={`px-5 md:px-8 ${
        viewportFit
          ? 'flex py-[5.5rem] md:min-h-[calc(100dvh-4rem)] md:items-center md:py-[clamp(1.5rem,5vh,4rem)]'
          : ''
      }`}
      style={viewportFit ? undefined : sectionPad}
    >
      <div className="mx-auto w-full" style={{ maxWidth: 1100 }}>
        {hasCenteredHeader ? (
          <SectionHeader
            eyebrow={eyebrow as string}
            title={title as string}
            subtext={subtext as string}
          />
        ) : null}

        <div
          className={`flex flex-col items-center gap-12 md:items-center md:gap-16 ${rowClass}`}
          style={{ marginTop: hasCenteredHeader ? 56 : 0 }}
        >
          {/* Mockup slot — first in DOM so it stacks on top on mobile.
              Always stretches to the row's full (content-driven) height on
              desktop and centers the mockup within it, so whichever side is
              shorter (mockup or text) centers against the taller one's
              actual content, the same way regardless of which mockup is
              plugged in or how tall its content is. */}
          <div
            data-reveal
            className="flex w-full items-center justify-center md:w-[55%] md:self-stretch"
          >
            {mockup}
          </div>

          <div
            className={`flex w-full flex-col md:w-[45%] ${compactCopy ? 'gap-[30px]' : 'gap-8'}`}
          >
            {heading && body ? (
              <div
                data-reveal
                className={`flex flex-col ${compactCopy ? 'gap-5' : 'gap-3'}`}
                style={{ textAlign: 'left' }}
              >
                <h2
                  style={{
                    fontSize: 'clamp(26px, 4vw, 36px)',
                    fontWeight: 500,
                    letterSpacing: '-0.03em',
                    color: '#E8E6F0',
                    lineHeight: 1.15,
                  }}
                >
                  {heading}
                </h2>
                <p style={{ fontSize: 15, color: bodyColor, lineHeight: 1.6 }}>{body}</p>
              </div>
            ) : null}
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
