// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { initialState, normalize } from './store'
import Quote from './Quote'

describe('podatki na ponudbi', () => {
  it('prikaže izdajatelja, rok in pogoje, ne pa internih postavk', () => {
    cleanup()
    const s = initialState(), j = { ...s.current, quoteTerms: { delivery: 'približno 2 tedna', validUntil: '2026-12-01', terms: 'Prevzem po dogovoru' } }
    s.settings.issuer = { name: 'Preizkusni izdajatelj', contact: 'primer@example.test' }
    const { container } = render(<Quote job={j} settings={s.settings} number="TEST" />)
    expect(screen.getByText('Preizkusni izdajatelj')).toBeTruthy()
    expect(container.textContent).toContain('Predviden rok: približno 2 tedna')
    expect(container.textContent).toContain('Pogoji: Prevzem po dogovoru')
    expect(container.textContent).not.toMatch(/marža|neuspele tiske/i)
    const restored = normalize(JSON.parse(JSON.stringify({ ...s, current: j })))
    expect(restored.settings.issuer).toEqual(s.settings.issuer)
    expect(restored.current.quoteTerms).toEqual(j.quoteTerms)
  })
})
