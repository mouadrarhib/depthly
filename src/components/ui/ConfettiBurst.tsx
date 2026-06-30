import { useEffect, useRef, useState } from 'react'

const COLORS = ['#4B9EFF', '#C8FF64', '#3DD68C', '#4B9EFF', '#3DD68C', '#C8FF64']

const STYLE_ID = 'confetti-burst-keyframes'

function ensureKeyframes() {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = `
    @keyframes confetti-fly {
      to {
        transform: translate(var(--tx), var(--ty)) rotate(var(--rot));
        opacity: 0;
      }
    }
  `
  document.head.appendChild(el)
}

interface Particle {
  id:    number
  color: string
  tx:    string
  ty:    string
  rot:   string
  size:  number
  round: boolean
  delay: string
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.8
    const dist  = 36 + Math.random() * 56
    return {
      id:    i,
      color: COLORS[i % COLORS.length],
      tx:    `${Math.round(Math.cos(angle) * dist)}px`,
      ty:    `${Math.round(Math.sin(angle) * dist)}px`,
      rot:   `${Math.round(Math.random() * 720 - 360)}deg`,
      size:  4 + Math.round(Math.random() * 4),
      round: Math.random() > 0.5,
      delay: `${Math.round(Math.random() * 120)}ms`,
    }
  })
}

interface ConfettiBurstProps {
  trigger: boolean
}

export function ConfettiBurst({ trigger }: ConfettiBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    ensureKeyframes()
  }, [])

  useEffect(() => {
    if (!trigger) return
    setParticles(makeParticles(14))
    timerRef.current = setTimeout(() => setParticles([]), 1000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [trigger])

  if (particles.length === 0) return null

  return (
    <div
      style={{
        position:       'absolute',
        inset:          0,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        pointerEvents:  'none',
        zIndex:         10,
        overflow:       'hidden',
      }}
    >
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position:        'absolute',
            width:            p.size,
            height:           p.size,
            backgroundColor:  p.color,
            borderRadius:     p.round ? '50%' : 2,
            animation:        `confetti-fly 800ms ease-out ${p.delay} both`,
            '--tx':           p.tx,
            '--ty':           p.ty,
            '--rot':          p.rot,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
