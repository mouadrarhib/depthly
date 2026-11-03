import assert from 'node:assert/strict'
import { test } from 'node:test'

import { authPath, resolveAuthNext, safeAuthNext } from '@/lib/authRedirect'
import { checkoutIntentFromDestination, parseCheckoutIntent } from '@/lib/checkoutIntent'

Object.defineProperty(globalThis, 'window', { value: { location: { origin: 'http://localhost:5173' } } })

test('paid selections survive auth-page switches and retain checkout variant and amount', () => {
  const cases = [
    ['plan=pro&interval=monthly', 'pro_monthly', '$5 per month'],
    ['plan=pro&interval=annual', 'pro_yearly', '$39 per year'],
    ['plan=lifetime', 'lifetime', '$79 one-time payment'],
  ]
  for (const [query, variant, price] of cases) {
    const destination = resolveAuthNext(new URLSearchParams(query))
    const login = new URL(authPath('/login', destination), window.location.origin)
    const afterLogin = resolveAuthNext(login.searchParams)
    const signup = new URL(authPath('/signup', afterLogin), window.location.origin)
    const afterSignup = resolveAuthNext(signup.searchParams)
    assert.equal(afterSignup, destination)
    assert.equal(checkoutIntentFromDestination(afterSignup)?.planType, variant)
    assert.equal(checkoutIntentFromDestination(afterSignup)?.price, price)
  }
})

test('unsupported plans and periods cannot select a checkout variant', () => {
  for (const query of ['plan=enterprise', 'plan=pro&interval=weekly', 'plan=free', 'interval=annual']) {
    assert.equal(parseCheckoutIntent(new URLSearchParams(query)), null)
    assert.equal(resolveAuthNext(new URLSearchParams(query)), '/dashboard')
  }
  assert.equal(parseCheckoutIntent(new URLSearchParams('plan=pro'))?.planType, 'pro_monthly')
})

test('free signup and existing invitation destinations keep their behavior', () => {
  assert.equal(resolveAuthNext(new URLSearchParams()), '/dashboard')
  assert.equal(resolveAuthNext(new URLSearchParams({ next: '/join/study?source=invite' })), '/join/study?source=invite')
  assert.equal(checkoutIntentFromDestination('/join/study?plan=pro'), null)
})

test('auth destinations reject external and malformed redirects', () => {
  for (const destination of ['https://example.com', '//example.com', '/\\example.com', 'javascript:alert(1)']) {
    assert.equal(safeAuthNext(destination), '/dashboard')
  }
  assert.equal(resolveAuthNext(new URLSearchParams('plan=pro&interval=annual&next=https://example.com')), '/billing?plan=pro&interval=annual')
})
