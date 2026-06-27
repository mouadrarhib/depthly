import type { Config } from 'tailwindcss'

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
        'depth-bg':      '#0D0D10',
        'depth-surface': '#141417',
        'depth-raised':  '#222228',
        'depth-border':  '#2E2E38',
        'brand':         '#4B9EFF',
        'streak':        '#C8FF64',
        'ink-primary':   '#E8E6F0',
        'ink-secondary': '#7A7890',
        'ink-muted':     '#3D3B4E',

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
        card:  '0 2px 8px -2px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.04) inset',
        modal: '0 24px 64px -16px rgba(0,0,0,0.6)',
        glow:  '0 0 24px -4px #4B9EFF',
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
  plugins: [require('tailwindcss-animate')],
}

export default config
