import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Landing page animation system (GSAP + ScrollTrigger).
 *
 * Opt-in via data attributes — components stay free of animation code:
 *   data-hero          — hero entrance timeline (staggered fade-up on load)
 *   data-reveal-group  — container whose [data-reveal] children fade-up
 *                        with a stagger when scrolled into view
 *   data-reveal        — an element revealed by its nearest group
 *   data-heatmap       — container whose [data-heat-cell] children pop in
 *   data-countup       — numeric text counted up from 0 (optional data-suffix)
 *
 * Everything is skipped for users with prefers-reduced-motion: content
 * renders fully visible with no motion.
 */
export function useLandingAnimations(rootRef: RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const mm = gsap.matchMedia()

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // ── Hero entrance ────────────────────────────────────────────────
      const heroItems = root.querySelectorAll('[data-hero]')
      if (heroItems.length) {
        gsap.fromTo(
          heroItems,
          { y: 26, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.12, delay: 0.05 },
        )
      }

      // ── Scroll reveals — each group staggers its children ────────────
      root.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
        const items = group.querySelectorAll('[data-reveal]')
        if (!items.length) return
        gsap.fromTo(
          items,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.1,
            scrollTrigger: { trigger: group, start: 'top 80%', once: true },
          },
        )
      })

      // ── Heatmap cells pop in ─────────────────────────────────────────
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
          },
        )
      })

      // ── Count-up numbers ─────────────────────────────────────────────
      root.querySelectorAll<HTMLElement>('[data-countup]').forEach((el) => {
        const end = Number(el.dataset.countup)
        if (Number.isNaN(end)) return
        const suffix = el.dataset.suffix ?? ''
        const proxy = { v: 0 }
        gsap.to(proxy, {
          v: end,
          duration: 1.4,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          onUpdate: () => {
            el.textContent = `${Math.round(proxy.v)}${suffix}`
          },
        })
      })
    })

    return () => mm.revert()
  }, [rootRef])
}
