import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ── shadcn/ui CSS-variable tokens ──────────────────────────────────
      colors: {
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border:  'hsl(var(--border))',
        input:   'hsl(var(--input))',
        ring:    'hsl(var(--ring))',

        // ── Depthly brand tokens (keep alongside shadcn) ─────────────────
        'depth-bg':      'var(--color-surface-base)',
        'depth-surface': 'var(--color-surface-raised)',
        'depth-raised':  'var(--color-surface-overlay)',
        'depth-border':  'var(--color-border)',
        'brand':         'var(--color-brand)',
        'streak':        'var(--color-streak)',
        'ink-primary':   'var(--color-text)',
        'ink-secondary': 'var(--color-text-muted)',
        'ink-muted':     'var(--color-text-faint)',

        // ── Legacy Depthly CSS-var tokens (backward compat) ──────────────
        surface: {
          base:    'var(--color-surface-base)',
          raised:  'var(--color-surface-raised)',
          overlay: 'var(--color-surface-overlay)',
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
      },
      borderRadius: {
        lg:  'var(--radius)',
        md:  'calc(var(--radius) - 2px)',
        sm:  'calc(var(--radius) - 4px)',
        xl:  '1.25rem',
        '2xl': '1.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card:  'var(--shadow-card)',
        modal: 'var(--shadow-modal)',
        glow:  '0 0 24px -4px var(--color-brand)',
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
  plugins: [animate],
}

export default config
