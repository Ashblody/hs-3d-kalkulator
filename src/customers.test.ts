import { describe, it, expect, vi } from 'vitest'
vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
import { initialState, newProject, normalize } from './store'
import { applyCustomer, applyCustomerQuick, customerTotals, newCustomer } from './customers'
import { mergeStates } from './backup'
import { quickCalc, quickDefaults, quickToProject } from './quick'
import { calculate } from './calc'
import { blankJob } from './seed'

describe('stranke', () => {
  const st = initialState()
  const c = newCustomer('Robert', { phone: '041 111 222' })
  const q = { ...quickDefaults, printH: 20, grams: 500, workH: 3.5, printRate: 4, workRate: 25, markupPct: 10, matKg: 30, business: true }
  const saved = quickToProject(q, 'Nosilček', st.settings, c)
  const p = newProject(saved.input, saved.snapshot)
  it('Hitri shrani stranko in ceno', () => {
    expect(p.input.customerId).toBe(c.id); expect(p.input.client).toBe('Robert')
    expect(calculate(p.input, p.snapshot).net).toBeCloseTo(quickCalc(q).business, 1)
  })
  it('Hitri: izbira stranke predizpolni zadnji cenik', () => {
    const r = applyCustomerQuick(quickDefaults, c, [p])
    expect(r).toMatchObject({ printRate: 4, workRate: 25, markupPct: 10, matKg: 30, business: true })
  })
  it('Podroben: izbira stranke prevzame način, cenik, rezervo, datoteko', () => {
    const pp = newProject({ ...blankJob(), customerId: c.id, mode: 'poslovno', reservePct: 25, fileSale: { kind: 'step' }, rateOverride: { printHourly: 5, labourHourly: 30, roundTo: 5 } }, st.settings)
    const j = applyCustomer(blankJob(), c, [pp], st.settings)
    expect(j).toMatchObject({ customerId: c.id, client: 'Robert', mode: 'poslovno', reservePct: 25, fileSale: { kind: 'step' } })
    expect(j.rateOverride).toMatchObject({ printHourly: 5, labourHourly: 30, roundTo: 5 })
    const a = calculate({ ...j, scanH: 1 }, st.settings), b = calculate({ ...j, scanH: 0 }, st.settings)
    expect(a.netBeforeRounding - b.netBeforeRounding).toBeCloseTo(60, 1) // 30 €/h × 2 (poslovno)
  })
  it('zgodovina in vsote', () => {
    const t = customerTotals([p, { ...p, id: 'x', status: 'placano' }], c.id)
    expect(t.count).toBe(2); expect(t.paid).toBeCloseTo(t.total / 2, 2)
  })
  it('kopija: stranke se ohranijo in združijo brez dvojnikov', () => {
    const a = { ...st, customers: [c] }
    const b = normalize(JSON.parse(JSON.stringify({ ...st, customers: [c, newCustomer('Matej')] })))
    const m = mergeStates(a, b).state
    expect(m.customers.map((x) => x.name).sort()).toEqual(['Matej', 'Robert'])
    expect(normalize(JSON.parse(JSON.stringify(m))).customers.length).toBe(2)
  })
})
