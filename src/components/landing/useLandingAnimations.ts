import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * One coordinated GSAP motion system for the public landing page.
 * Hero content stays opaque so the value proposition remains readable on
 * first paint. Supporting content reveals on load or as it enters the page.
 */
export function useLandingAnimations(rootRef: RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const nav = root.querySelector('[data-landing-nav]')
      const heroItems = root.querySelectorAll('[data-hero]')
      const heroGrid = root.querySelector('[data-hero-grid]')

      const entrance = gsap.timeline({ defaults: { ease: 'power3.out' } })
      if (nav) {
        entrance.fromTo(nav, { y: -14 }, { y: 0, duration: 0.55 })
      }
      if (heroItems.length) {
        entrance.fromTo(
          heroItems,
          { y: 24 },
          { y: 0, duration: 0.75, stagger: 0.09 },
          nav ? 0.08 : 0
        )
      }
      if (heroGrid) {
        gsap.fromTo(
          heroGrid,
          { scale: 1.035, backgroundPosition: '0px 10px' },
          { scale: 1, backgroundPosition: '0px 0px', duration: 1.8, ease: 'power2.out' }
        )
      }

      // The example's result unfolds in the same order as the product:
      // a finished session contributes to a goal, then to the weekly view.
      const goalFill = root.querySelector('[data-hero-goal-fill]')
      const weekBars = root.querySelectorAll('[data-hero-week-bar]')
      if (goalFill && weekBars.length) {
        const progressTimeline = gsap.timeline({
          scrollTrigger: { trigger: goalFill, start: 'top 90%', once: true },
        })
        progressTimeline.fromTo(
          goalFill,
          { scaleX: 0.18, transformOrigin: 'left center' },
          { scaleX: 1, duration: 0.65, ease: 'power3.out' }
        )
        progressTimeline.fromTo(
          weekBars,
          { scaleY: 0.2, transformOrigin: 'center bottom' },
          { scaleY: 1, duration: 0.48, stagger: 0.045, ease: 'power3.out' },
          '-=0.2'
        )
      }

      // Reveal the path in reading order. On phones, each step waits until
      // that row reaches the viewport instead of finishing below the fold.
      const focusPath = root.querySelector('[data-focus-path]')
      if (focusPath) {
        const pathHeader = focusPath.querySelector('[data-focus-path-header]')
        const pathSteps = focusPath.querySelectorAll('[data-focus-step]')

        if (window.matchMedia('(min-width: 768px)').matches) {
          const pathTimeline = gsap.timeline({
            scrollTrigger: { trigger: pathHeader ?? focusPath, start: 'top 85%', once: true },
          })

          if (pathHeader) {
            pathTimeline.fromTo(
              pathHeader,
              { y: 22, opacity: 0 },
              { y: 0, opacity: 1, duration: 0.48, ease: 'power3.out' }
            )
          }

          pathTimeline.fromTo(
            pathSteps,
            { y: 18, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.36, stagger: 0.3, ease: 'power3.out' }
          )
        } else {
          if (pathHeader) {
            gsap.fromTo(
              pathHeader,
              { y: 22, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.55,
                ease: 'power3.out',
                scrollTrigger: { trigger: pathHeader, start: 'top 85%', once: true },
              }
            )
          }

          pathSteps.forEach((step) => {
            gsap.fromTo(
              step,
              { y: 18, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.5,
                ease: 'power3.out',
                scrollTrigger: { trigger: step, start: 'top 88%', once: true },
              }
            )
          })
        }
      }

      root.querySelectorAll('[data-pricing-graphic]').forEach((pricingGraphic) => {
        const pricingLine = pricingGraphic.querySelector('[data-pricing-line]')
        const pricingNodes = pricingGraphic.querySelectorAll('[data-pricing-node]')
        const pricingTimeline = gsap.timeline({
          scrollTrigger: { trigger: pricingGraphic, start: 'top 88%', once: true },
        })
        if (pricingLine) {
          const lineLength = (pricingLine as SVGPathElement).getTotalLength()
          pricingTimeline.fromTo(
            pricingLine,
            { strokeDasharray: lineLength, strokeDashoffset: lineLength },
            { strokeDashoffset: 0, duration: 0.85, ease: 'power2.out' }
          )
        }
        if (pricingNodes.length) {
          pricingTimeline.fromTo(
            pricingNodes,
            { scale: 0.94, opacity: 0, transformOrigin: 'center center' },
            { scale: 1, opacity: 1, duration: 0.35, stagger: 0.12, ease: 'power2.out' },
            pricingLine ? 0.12 : 0
          )
        }
      })

      const answersLine = root.querySelector('[data-answers-line]')
      if (answersLine) {
        gsap.fromTo(
          answersLine,
          { strokeDasharray: 90, strokeDashoffset: 90 },
          {
            strokeDashoffset: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: { trigger: answersLine, start: 'top 88%', once: true },
          }
        )
      }

      // Each section reveals in its own reading order as its content enters.
      // Elements remain visible in the markup if JavaScript or GSAP fails.
      root.querySelectorAll('[data-reveal-group]').forEach((group) => {
        group.querySelectorAll<HTMLElement>('[data-reveal]').forEach((item) => {
          if (!item.getClientRects().length) return
          gsap.fromTo(
            item,
            { y: 20, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.58,
              ease: 'power3.out',
              scrollTrigger: { trigger: item, start: 'top 88%', once: true },
            }
          )
        })
      })

      root.querySelectorAll<HTMLElement>('[data-heatmap]').forEach((map) => {
        const cells = map.querySelectorAll('[data-heat-cell]')
        if (!cells.length) return
        gsap.fromTo(
          cells,
          { scale: 0.4, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.38,
            ease: 'back.out(1.7)',
            stagger: { each: 0.012, from: 'start' },
            scrollTrigger: { trigger: map, start: 'top 82%', once: true },
          }
        )
      })

      root.querySelectorAll<HTMLElement>('[data-countup]').forEach((element) => {
        const end = Number(element.dataset.countup)
        if (Number.isNaN(end)) return
        const suffix = element.dataset.suffix ?? ''
        const proxy = { value: 0 }
        gsap.to(proxy, {
          value: end,
          duration: 1.4,
          ease: 'power2.out',
          scrollTrigger: { trigger: element, start: 'top 88%', once: true },
          onUpdate: () => {
            element.textContent = `${Math.round(proxy.value)}${suffix}`
          },
        })
      })
    })

    return () => mm.revert()
  }, [rootRef])
}
