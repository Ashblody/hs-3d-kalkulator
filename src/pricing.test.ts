import { describe, it, expect, vi } from 'vitest'
vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
import { calculate, legacyPricing, r2 } from './calc'
import { blankJob, defaultSettings } from './seed'
import { quickCalc, quickDefaults, quickExtras, quickToProject } from './quick'
import type { Settings } from './types'

/** testni primer: Trček ASA Plus 21,90 €/800 g, 109 g, 3 h tiska po 3,50 €/h, 1 h dela po 20 €/h */
const job = { ...blankJob(), materialId: 'tr3-asaplus', printerId: 'x2d', pieces: 1, gramsPerPiece: 109, hoursPerPiece: 3, minutesPerPiece: 0, prepH: 1, reservePct: 10 }
const withS = (f: (s: Settings) => void) => { const s = defaultSettings(); f(s); return s }

describe('v10 pribitki: osnova → rezerva 10 % → marža 20 % → (DDV) → zaokroževanje', () => {
  it('privzete nastavitve', () => {
    const s = defaultSettings()
    expect([s.rates.reservePct, s.rates.wastePct, s.rates.marginPct, s.business.vatEnabled, s.business.vatPct]).toEqual([10, 5, 20, false, 22])
  })
  it('testni primer brez odpada in brez lepila: osnova 33,48 → 44,20 → 45 € (zaokroženo navzgor na 1 €)', () => {
    const s = withS((s) => { s.rates.wastePct = 0; s.materials = s.materials.map((m) => (m.id === 'tr3-asaplus' ? { ...m, adhesive: 0 } : m)) })
    const r = calculate(job, s)
    expect([r2(r.materialSale), r2(r.base), r2(r.fail), r2(r.margin), r2(r.netBeforeRounding), r.net]).toEqual([2.98, 33.48, 3.35, 7.37, 44.2, 45])
  })
  it('testni primer z lepilom 0,5 € (ASA, samodejno) brez odpada: 44,86 → 45 €', () => {
    const r = calculate(job, withS((s) => { s.rates.wastePct = 0 }))
    expect([r2(r.adhesive), r2(r.base), r2(r.netBeforeRounding), r.net]).toEqual([0.5, 33.98, 44.86, 45])
  })
  it('testni primer s privzetimi (odpad 5 % = 114,45 g, lepilo 0,5 €): 45,06 → 46 €', () => {
    const r = calculate(job, defaultSettings())
    expect([r2(r.kg * 1000), r2(r.materialSale), r2(r.base), r2(r.netBeforeRounding), r.net]).toEqual([114.45, 3.13, 34.13, 45.06, 46])
  })
  it('DDV vklopljen: DDV pred zaokroževanjem', () => {
    const r = calculate(job, withS((s) => { s.business.vatEnabled = true }))
    expect(r.gross).toBe(Math.ceil(r2(45.0565 * 1.22))); expect(r2(r.net + r.vat)).toBe(r.gross)
  })
  it('akcijska cena: stranka vedno po redni ceni, moj strošek po plačani, razlika = dodatni zaslužek', () => {
    const reg = calculate(job, defaultSettings())
    const sale = calculate(job, withS((s) => { s.materials = s.materials.map((m) => (m.id === 'tr3-asaplus' ? { ...m, activePrice: 1 } : m)) }))
    expect(sale.net).toBe(reg.net); expect(sale.materialSale).toBeCloseTo(reg.materialSale, 9)
    expect(sale.material).toBeCloseTo(0.10900 * 1.05 * 12.05 / 0.8, 9)
    expect(sale.saleBonus).toBeCloseTo(0.10900 * 1.05 * (21.9 - 12.05) / 0.8, 9); expect(reg.saleBonus).toBe(0)
  })
  it('star posnetek cenika (brez marginPct) računa kot prej', () => {
    const r = calculate(job, legacyPricing(defaultSettings()))
    expect([r.fail, r.margin, r.wasteG, r2(r.netBeforeRounding)]).toEqual([0, 0, 0, 33.98])
  })
  it('Hitri: isti testni primer in shranjen projekt da isto ceno', () => {
    const s = defaultSettings()
    const q = { ...quickDefaults, printH: 3, grams: 109, workH: 1, matKg: 27.375, printRate: 3.5, workRate: 20, ...quickExtras(s), roundTo: 1 }
    const r = quickCalc(q)
    expect([r.material, r.fail, r.margin, r.exact, r.total]).toEqual([3.13, 3.36, 7.4, 44.4, 45])
    expect(quickCalc({ ...q, wastePct: 0 }).exact).toBe(44.2)
    const p = quickToProject(q, 'x', s)
    expect(calculate(p.input, p.snapshot).net).toBe(45)
  })
})

import { initialState, normalize, newProject } from './store'
describe('stari projekti po nalaganju', () => {
  it('posnetek brez marginPct ostane stari cenik (brez marže/odpada), globalni cenik dobi nove privzete', () => {
    const st = initialState(); const old = legacyPricing(defaultSettings())
    const p = newProject(job, old)
    const raw = JSON.parse(JSON.stringify({ ...st, settings: old, projects: [p] }))
    const back = normalize(raw)
    expect(back.settings.rates.marginPct).toBe(20); expect(back.settings.rates.wastePct).toBe(5)
    expect(back.projects[0].snapshot.rates.marginPct).toBeUndefined()
    expect(calculate(back.projects[0].input, back.projects[0].snapshot).net).toBe(calculate(job, old).net)
  })
})

describe('marža na projektu', () => {
  it('privzeto iz Nastavitev, polje projekta jo povozi; stari cenik je ne uporabi', () => {
    expect(calculate(job, defaultSettings()).marginPct).toBe(20)
    const r = calculate({ ...job, marginPct: 30 }, defaultSettings())
    expect(r.marginPct).toBe(30); expect(r.margin).toBeCloseTo((r.base + r.fail) * 0.3, 9)
    expect(calculate({ ...job, marginPct: 30 }, legacyPricing(defaultSettings())).margin).toBe(0)
  })
})
