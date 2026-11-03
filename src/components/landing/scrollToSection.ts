/** Keep section jumps aligned with the visitor's motion preference. */
export function scrollToSection(sectionId: string) {
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  document.getElementById(sectionId)?.scrollIntoView({ behavior })
}
