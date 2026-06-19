import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ── Design tokens ──────────────────────────────────────────────
      // Swap these per project; the rest of the codebase uses these names.
      colors: {
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover:   'var(--color-brand-hover)',
          subtle:  'var(--color-brand-subtle)',
        },
        surface: {
          base:    'var(--color-surface-base)',
          raised:  'var(--color-surface-raised)',
          overlay: 'var(--color-surface-overlay)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle:  'var(--color-border-subtle)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted:   'var(--color-text-muted)',
          faint:   'var(--color-text-faint)',
        },
        feedback: {
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          error:   'var(--color-error)',
          info:    'var(--color-info)',
        },
        // The one loud accent — streaks, habit indicators, earned/Pro states.
        // Never use decoratively; it should always mean "you earned this."
        streak: {
          DEFAULT: 'var(--color-streak)',
        },
      },
      fontFamily: {
        // Depthly uses Inter for everything except data — no separate
        // display face. Personality comes from weight + tight tracking.
        sans: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm:  '6px',
        DEFAULT: '8px',
        md:  '10px',
        lg:  '14px',
        xl:  '20px',
      },
      boxShadow: {
        card:    '0 2px 8px -2px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.04) inset',
        modal:   '0 24px 64px -16px rgba(0,0,0,0.6)',
        glow:    '0 0 24px -4px var(--color-brand)',
      },
      animation: {
        'timer-pulse':  'timer-pulse 2s ease-in-out infinite',
        'streak-pop':   'streak-pop 0.3s cubic-bezier(.34,1.56,.64,1)',
        'ring-breathe': 'ring-breathe 3s ease-in-out infinite',
      },
      keyframes: {
        'timer-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        'streak-pop': {
          '0%':   { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        'ring-breathe': {
          '0%, 100%': { transform: 'scale(1)',    opacity: '1' },
          '50%':      { transform: 'scale(1.04)', opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}

export default config
