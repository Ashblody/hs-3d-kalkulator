import { describe, it, expect } from 'vitest'
import { calculate, markupToMargin, r2, totalPrintHours, wearPerHour } from './calc'
import { defaultSettings, demoJob } from './seed'

describe('demo projekt Nosilci lučk', () => {
  const s = defaultSettings()
  const res = calculate(demoJob(), s)
  it('čas in material', () => {
    expect(r2(res.printHours)).toBe(18.8)
    expect(r2(res.material)).toBe(20.46)
  })
  it('elektrika 1,69', () => expect(r2(res.electricity)).toBe(1.69))
  it('amortizacija X2D', () => {
    expect(wearPerHour(s.printers[0])).toBeCloseTo(0.3568, 4)
    expect(r2(res.wear)).toBe(6.71)
  })
  it('stroški tiskanja ~35,5', () => {
    expect(r2(res.printCost)).toBeGreaterThanOrEqual(35.4)
    expect(r2(res.printCost)).toBeLessThanOrEqual(35.6)
    expect(res.printCost).toBeCloseTo((res.material + res.electricity + res.wear + 3.4) * 1.1, 10)
  })
  it('prodajna cena tiska = stroški × 1,5', () => {
    expect(res.printSale).toBeCloseTo(res.printCost * 1.5, 10)
    expect(r2(res.printSale)).toBeGreaterThanOrEqual(53.1)
    expect(r2(res.printSale)).toBeLessThanOrEqual(53.4)
  })
  it('storitve 78,75', () => expect(r2(res.services)).toBe(78.75))
  it('končna cena ~132', () => {
    expect(res.net).toBeCloseTo(res.printSale + 78.75, 10)
    expect(Math.abs(res.net - 132.2)).toBeLessThan(0.5)
  })
  it('izpis točnih vrednosti', () => {
    console.log(JSON.stringify({ material: r2(res.material), elektrika: r2(res.electricity), amortizacija: r2(res.wear), rezerva: r2(res.reserve), strosekTiska: r2(res.printCost), prodajaTiska: r2(res.printSale), storitve: r2(res.services), koncna: r2(res.net) }))
  })
})

describe('pravila', () => {
  const s = defaultSettings()
  it('pribitek ni marža', () => expect(r2(markupToMargin(50))).toBe(33.33))
  it('skupen čas serije se ne množi s kosi', () => {
    const j = { ...demoJob(), useBatchTime: true, batchHours: 10, batchMinutes: 30 }
    expect(totalPrintHours(j)).toBe(10.5)
  })
  it('prijateljski popust samo na storitve', () => {
    const j = { ...demoJob(), mode: 'prijatelj' as const, km: 10 }
    const a = calculate(j, s), b = calculate({ ...j, mode: 'stranka' }, s)
    expect(a.printSale).toBeCloseTo(b.printSale)
    expect(a.transport).toBeCloseTo(b.transport)
    expect(a.services).toBeCloseTo(78.75 * 0.85)
  })
  it('zase: samo stroški, čas informativno', () => {
    const a = calculate({ ...demoJob(), mode: 'zase' }, s)
    expect(a.net).toBeCloseTo(a.printCost)
    expect(r2(a.timeValue)).toBe(78.75)
  })
  it('minimalno naročilo', () => {
    const a = calculate({ ...demoJob(), scanH: 0, editH: 0, cadH: 0, prepH: 0, finishH: 0, pieces: 1, gramsPerPiece: 5, hoursPerPiece: 0, minutesPerPiece: 20, consumables: 0 }, s)
    expect(a.net).toBe(15)
  })
  it('DDV ločen', () => {
    const s2 = defaultSettings(); s2.business.vatEnabled = true
    const a = calculate(demoJob(), s2)
    expect(a.gross).toBeCloseTo(a.net * 1.22)
  })
  it('ročna sprememba stroškov', () => {
    const a = calculate({ ...demoJob(), printCostOverride: 40 }, s)
    expect(a.printSale).toBeCloseTo(60)
  })
})

import { normalize, initialState } from './store'
describe('varnostna kopija', () => {
  it('izvoz/uvoz ohrani podatke', () => {
    ;(globalThis as any).window = { matchMedia: () => ({ matches: false }) }
    const s = initialState()
    const back = normalize(JSON.parse(JSON.stringify(s)))
    expect(back.projects[0].input.name).toBe('Nosilci lučk – 2 leva + 2 desna')
    expect(r2(calculate(back.projects[0].input, back.projects[0].snapshot).net)).toBe(131.98)
  })
  it('zavrne neveljavno datoteko', () => {
    expect(() => normalize({ foo: 1 })).toThrow()
  })
})

import { materialsV2 } from './seed'
describe('migracija materialov', () => {
  it('doda nove, ohrani urejene in ne vrne izbrisanih', () => {
    const old = defaultSettings()
    old.materials = old.materials.filter((m) => !m.id.startsWith('bb2-') && !m.id.startsWith('pm2-') && !m.id.startsWith('tr2-') && m.id !== 'pm-asa')
    delete old.materialSeeds
    old.materials[0].prices[0].price = 99
    const st = normalize({ settings: old, projects: [] })
    expect(st.settings.materials[0].prices[0].price).toBe(99)
    expect(st.settings.materials.find((m) => m.id === 'pm-asa')).toBeUndefined()
    for (const m of materialsV2) expect(st.settings.materials.some((x) => x.id === m.id)).toBe(true)
    const again = normalize(st)
    expect(again.settings.materials.length).toBe(st.settings.materials.length)
  })
})
