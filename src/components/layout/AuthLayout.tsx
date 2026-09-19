import { ArrowLeft } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { Logo } from '@/components/ui'
import { PATHS } from '@/routes/paths'

/**
 * Focused authentication shell shared by sign-in and sign-up.
 * The visual story stays on desktop; mobile prioritizes the form.
 */
export function AuthLayout() {
  const location = useLocation()

  return (
    <div className="min-h-dvh bg-depth-bg lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,0.95fr)]">
      <aside className="relative hidden min-h-dvh overflow-hidden border-r border-depth-border lg:flex">
        <img
          src="/images/focus-work-hero.png"
          alt=""
          aria-hidden="true"
          className="auth-visual-enter absolute inset-0 h-full w-full object-cover object-[62%_50%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,16,0.38)_0%,rgba(13,13,16,0.2)_38%,rgba(13,13,16,0.94)_100%)]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-depth-bg/20" />

        <div className="relative flex min-h-dvh w-full flex-col p-10 xl:p-14">
          <Link
            to={PATHS.home}
            aria-label="Depthly home"
            className="w-fit text-ink-primary transition-opacity hover:opacity-80"
          >
            <Logo size={30} withWordmark />
          </Link>

          <div className="auth-copy-enter mt-auto max-w-[590px]">
            <p className="text-[clamp(38px,4.6vw,64px)] font-medium leading-[1.03] tracking-[-0.045em] text-ink-primary">
              Focus on the work. Keep the progress.
            </p>
            <p className="mt-6 max-w-[500px] text-base leading-7 text-ink-primary/75">
              A focused place for study, client work, and everything you are learning.
            </p>

            <div className="mt-10 grid grid-cols-3 border-t border-white/20 pt-5 text-sm text-ink-primary/70">
              <span>Focus</span>
              <span className="text-center">Track</span>
              <span className="text-right">Reflect</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="flex min-h-dvh min-w-0 flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
          <Link
            to={PATHS.home}
            aria-label="Depthly home"
            className="text-ink-primary transition-opacity hover:opacity-80 lg:invisible"
          >
            <Logo size={28} withWordmark />
          </Link>
          <Link
            to={PATHS.home}
            className="inline-flex items-center gap-2 text-sm text-ink-secondary transition-colors hover:text-ink-primary"
          >
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
            Back to home
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-5 pb-16 pt-8 sm:px-8 sm:pb-24">
          <div key={location.pathname} className="auth-form-enter w-full max-w-[420px]">
            <Outlet />
          </div>
        </main>
      </section>
    </div>
  )
}
