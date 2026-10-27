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

import { fixedMonths, monthOptions, yearOptions, shiftMonth, periodProjects, monthLabel } from './period'
import { calculate as calc2 } from './calc'
import type { Project } from './types'
function mk(date: string, status: Project['status'] = 'sprejeto'): Project {
  const s = defaultSettings(); const input = { ...demoJob(), date }
  return { id: date + status, name: 'p ' + date, status, input, snapshot: s, createdAt: date, updatedAt: date } as unknown as Project
}
describe('Posel: izbira obdobja', () => {
  const now = new Date(2026, 9, 27)
  it('pomožne funkcije', () => {
    expect(fixedMonths({ kind: 'month', ym: '2026-03' }, now)).toBe(1)
    expect(fixedMonths({ kind: 'year', year: 2026 }, now)).toBe(10)
    expect(fixedMonths({ kind: 'year', year: 2025 }, now)).toBe(12)
    expect(shiftMonth('2026-01', -1)).toBe('2025-12'); expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(monthLabel('2026-10')).toBe('oktober 2026')
    const ps = [mk('2025-11-05'), mk('2026-06-21', 'opravljeno'), mk('2026-06-02', 'ponudba'), mk('2026-02-01')]
    expect(monthOptions(ps, now)).toEqual(['2026-10', '2026-06', '2026-02', '2025-11'])
    expect(yearOptions(ps, now)).toEqual([2026, 2025])
    expect(periodProjects(ps, { kind: 'year', year: 2026 }).length).toBe(2)
    expect(periodProjects(ps, { kind: 'month', ym: '2026-06' }).length).toBe(1)
  })
  it('leto sešteje prihodke in množi fiksne stroške', () => {
    const s = defaultSettings(); s.business.monthlyFixed = 100
    const y = new Date().getFullYear()
    const ps = [mk(`${y}-01-10`), mk(`${y}-01-20`)]
    const rev = ps.reduce((a, p) => a + calc2(p.input, p.snapshot).net, 0)
    cleanup(); render(<Dashboard projects={ps} settings={s} />)
    fireEvent.click(screen.getByText('Celo leto'))
    const months = new Date().getMonth() + 1
    expect(document.body.textContent).toContain(`Celo leto ${y}`)
    expect(document.body.textContent).toContain(`× ${months} mes.`)
    expect(document.body.textContent).toContain('(2)')
    const sel = screen.getByLabelText('Leto') as HTMLSelectElement
    expect(sel.value).toBe(String(y))
    fireEvent.click(screen.getByLabelText('Prejšnje leto'))
    expect(document.body.textContent).toContain('× 12 mes. (celo leto)')
    expect(document.body.textContent).toContain(`V letu ${y - 1} še ni projektov`)
    expect(rev).toBeGreaterThan(0)
  })
  it('privzeto tekoči mesec in puščica na prejšnji mesec', () => {
    cleanup(); render(<Dashboard projects={[]} settings={defaultSettings()} />)
    expect(screen.getByLabelText('Mesec')).toBeTruthy()
    const d = new Date(); const cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    expect((screen.getByLabelText('Mesec') as HTMLSelectElement).value).toBe(cur)
    expect(document.body.textContent).toContain('V tem mesecu ni projektov')
    fireEvent.click(screen.getByLabelText('Prejšnji mesec'))
    expect((screen.getByLabelText('Mesec') as HTMLSelectElement).value).toBe(shiftMonth(cur, -1))
  })
})
