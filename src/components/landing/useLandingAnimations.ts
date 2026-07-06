import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Landing page animation system (GSAP + ScrollTrigger).
 *
 * Opt-in via data attributes — components stay free of animation code:
 *   data-hero          — hero entrance (staggered fade-up, part of the
 *                        load sequence)
 *   data-reveal-group  — container whose [data-reveal] children fade-up
 *                        with a stagger. Groups already inside the initial
 *                        viewport join the load sequence (chained after the
 *                        hero) since their scroll trigger point is met on
 *                        mount and could never show a visible transition;
 *                        groups below the fold reveal on scroll.
 *   data-reveal        — an element revealed by its nearest group
 *   data-heatmap       — container whose [data-heat-cell] children pop in
 *   data-countup       — numeric text counted up from 0 (optional data-suffix)
 *
 * The load sequence waits for the app's LogoIntro splash (~3.7s overlay on
 * every load) to unmount — otherwise the entrance would play hidden
 * underneath it and the page would look settled when the splash lifts.
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
      const heroItems = root.querySelectorAll('[data-hero]')

      // Partition reveal groups: in-viewport ones join the load sequence,
      // the rest get scroll triggers.
      const loadGroups: NodeListOf<Element>[] = []
      root.querySelectorAll<HTMLElement>('[data-reveal-group]').forEach((group) => {
        const items = group.querySelectorAll('[data-reveal]')
        if (!items.length) return

        // Any group visible at all in the initial viewport joins the load
        // sequence — its 'top 80%' scroll trigger would either fire on mount
        // (no visible transition) or sit unfired until a tiny scroll.
        if (group.getBoundingClientRect().top < window.innerHeight) {
          loadGroups.push(items)
        } else {
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
        }
      })

      // Hide load-sequence elements up front (before first paint) so there
      // is no flash while we wait for the splash to clear.
      gsap.set(heroItems, { y: 26, opacity: 0 })
      loadGroups.forEach((items) => gsap.set(items, { y: 30, opacity: 0 }))

      const playLoadSequence = () => {
        const tl = gsap.timeline()
        if (heroItems.length) {
          tl.to(heroItems, {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: 'power3.out',
            stagger: 0.12,
          })
        }
        // Chain each above-fold group shortly after the hero starts settling
        loadGroups.forEach((items, i) => {
          tl.to(
            items,
            { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.1 },
            heroItems.length ? 0.55 + i * 0.2 : 0.1 + i * 0.2,
          )
        })
      }

      // Wait for the LogoIntro splash overlay to unmount before playing.
      let observer: MutationObserver | undefined
      if (document.querySelector('.logo-intro')) {
        observer = new MutationObserver(() => {
          if (!document.querySelector('.logo-intro')) {
            observer?.disconnect()
            observer = undefined
            playLoadSequence()
          }
        })
        observer.observe(document.body, { childList: true, subtree: true })
      } else {
        playLoadSequence()
      }

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

      return () => observer?.disconnect()
    })

    return () => mm.revert()
  }, [rootRef])
}
