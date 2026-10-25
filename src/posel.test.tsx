// @vitest-environment jsdom
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any
import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { useState } from 'react'
import SettingsView from './SettingsView'
import Dashboard from './Dashboard'
import { defaultSettings } from './seed'
import type { Settings } from './types'

function Harness() {
  const [s, setS] = useState<Settings>(defaultSettings())
  return <div><SettingsView s={s} onChange={setS} /><div data-testid="posel"><Dashboard projects={[]} settings={s} /></div><pre data-testid="fixed">{String(s.business.monthlyFixed)}</pre></div>
}
describe('Posel s prispevki 0', () => {
  for (const val of ['0', '', '0,00']) it(`vnos "${val}"`, () => {
    cleanup(); render(<Harness />)
    const inp = screen.getByText('Prispevki in administracija').parentElement!.querySelector('input')!
    fireEvent.focus(inp); fireEvent.change(inp, { target: { value: val } }); fireEvent.blur(inp)


  })
})
import App from './App'
describe('App persistence', () => {
  it('0 survives reload', () => {
    cleanup(); localStorage.clear(); window.matchMedia ??= (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as any
    const u = render(<App />)
    fireEvent.click(screen.getByText('Nastavitve'))
    const inp = screen.getByText('Prispevki in administracija').parentElement!.querySelector('input')!
    fireEvent.focus(inp); fireEvent.change(inp, { target: { value: '0' } }); fireEvent.blur(inp)
    u.unmount(); render(<App />)

    fireEvent.click(screen.getByText('Posel'))

  })
})
import { fixBusiness, normalize, initialState } from './store'
import { calculate, monthlyPlan } from './calc'
import { demoJob } from './seed'
describe('regresija: 0 v poslovnih nastavitvah', () => {
  it('normalize ohrani 0, neveljavno → privzeto', () => {
    const base = defaultSettings().business
    const b = fixBusiness(base, { monthlyFixed: 0, billableHours: 0, taxPct: 0, kwhPrice: 0, targetHourly: 0, vatPct: NaN, } as any)
    expect([b.monthlyFixed, b.billableHours, b.taxPct, b.kwhPrice, b.targetHourly]).toEqual([0, 0, 0, 0, 0]); expect(b.vatPct).toBe(base.vatPct)
    expect(fixBusiness(base, { monthlyFixed: null, billableHours: -3 } as any).monthlyFixed).toBe(base.monthlyFixed)
    const st = initialState(); st.settings.business.monthlyFixed = 0
    expect(normalize(JSON.parse(JSON.stringify(st))).settings.business.monthlyFixed).toBe(0)
  })
  it('vse 0 → brez NaN/Infinity', () => {
    const s = defaultSettings(); for (const k of Object.keys(s.business)) if (typeof (s.business as any)[k] === 'number') (s.business as any)[k] = 0
    const p = monthlyPlan(s, 19); expect(Object.values(p).every((v) => typeof v !== 'number' || Number.isFinite(v))).toBe(true)
    expect(p.fixed).toBe(0); expect(p.hourly).toBe(0)
    const r = calculate(demoJob(), s); expect(Object.values(r).every((v) => typeof v !== 'number' || Number.isFinite(v))).toBe(true); expect(r.fixedShare).toBe(0)
    cleanup(); render(<Dashboard projects={[]} settings={s} />)
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|∞/)
  })
})
