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

      // Reveal the path in reading order: heading, then each stage.
      const focusPath = root.querySelector('[data-focus-path]')
      if (focusPath) {
        const pathHeader = focusPath.querySelector('[data-focus-path-header]')
        const pathSteps = focusPath.querySelectorAll('[data-focus-step]')
        const pathTimeline = gsap.timeline({
          scrollTrigger: { trigger: focusPath, start: 'top 78%', once: true },
        })

        if (pathHeader) {
          pathTimeline.fromTo(
            pathHeader,
            { y: 24, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }
          )
        }
        if (pathSteps.length) {
          pathTimeline.fromTo(
            pathSteps,
            { y: 24, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.55,
              ease: 'power3.out',
              stagger: 0.12,
            },
            pathHeader ? '-=0.15' : 0
          )
        }
      }

      const loadGroups: NodeListOf<Element>[] = []
      root.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
        const items = group.querySelectorAll('[data-reveal]')
        if (!items.length) return

        const revealFromX = (_index: number, element: Element) => {
          const direction = (element as HTMLElement).dataset.revealDirection
          if (direction === 'left') return -24
          if (direction === 'right') return 24
          return 0
        }

        const revealFromY = (_index: number, element: Element) =>
          (element as HTMLElement).dataset.revealDirection ? 18 : 36

        const revealFromScale = (_index: number, element: Element) =>
          (element as HTMLElement).dataset.revealDirection ? 0.995 : 0.985

        if (group.getBoundingClientRect().top < window.innerHeight) {
          loadGroups.push(items)
          return
        }

        gsap.fromTo(
          items,
          { x: revealFromX, y: revealFromY, opacity: 0, scale: revealFromScale },
          {
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.85,
            ease: 'power3.out',
            stagger: 0.11,
            scrollTrigger: { trigger: group, start: 'top 82%', once: true },
          }
        )
      })

      loadGroups.forEach((items) =>
        gsap.set(items, {
          x: (_index: number, element: Element) => {
            const direction = (element as HTMLElement).dataset.revealDirection
            if (direction === 'left') return -24
            if (direction === 'right') return 24
            return 0
          },
          y: (_index: number, element: Element) =>
            (element as HTMLElement).dataset.revealDirection ? 18 : 30,
          opacity: 0,
          scale: (_index: number, element: Element) =>
            (element as HTMLElement).dataset.revealDirection ? 0.995 : 0.99,
        })
      )

      const supportingEntrance = gsap.timeline()
      loadGroups.forEach((items, index) => {
        supportingEntrance.to(
          items,
          {
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.1,
          },
          0.35 + index * 0.2
        )
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
            duration: 0.45,
            ease: 'back.out(1.7)',
            stagger: { each: 0.018, from: 'start' },
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
