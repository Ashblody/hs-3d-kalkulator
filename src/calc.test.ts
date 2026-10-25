import { describe, it, expect } from 'vitest'
import { calculate, fileSaleInfo, markupToMargin, r2, totalPrintHours, wearPerHour } from './calc'
import { defaultSettings, demoJob , emptyJob } from './seed'

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
  it('prodajna cena tiska = stroški × 2', () => {
    expect(res.printSale).toBeCloseTo(res.printCost * 2, 10)
    expect(r2(res.printSale)).toBeGreaterThanOrEqual(70.9)
    expect(r2(res.printSale)).toBeLessThanOrEqual(71.1)
  })
  it('storitve 61,25', () => expect(r2(res.services)).toBe(61.25))
  it('končna cena 132,22', () => {
    expect(res.net).toBeCloseTo(res.printSale + 61.25, 10)
    expect(r2(res.net)).toBe(132.22)
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
    expect(a.printSale).toBeCloseTo(a.printCost + a.printHours * 1)
    expect(b.printSale).toBeCloseTo(b.printCost * 2)
    expect(a.transport).toBeCloseTo(b.transport)
    expect(a.services).toBeCloseTo(61.25 * 0.85)
  })
  it('zase: samo stroški, čas informativno', () => {
    const a = calculate({ ...demoJob(), mode: 'zase' }, s)
    expect(a.net).toBeCloseTo(a.printCost)
    expect(r2(a.timeValue)).toBe(61.25)
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
    expect(a.printSale).toBeCloseTo(80)
  })
})

import { normalize, initialState , startBlank, hasUnsaved } from './store'
describe('varnostna kopija', () => {
  it('izvoz/uvoz ohrani podatke', () => {
    ;(globalThis as any).window = { matchMedia: () => ({ matches: false }) }
    const s = initialState()
    const back = normalize(JSON.parse(JSON.stringify(s)))
    expect(back.projects[0].input.name).toBe('Nosilci lučk – 2 leva + 2 desna')
    expect(r2(calculate(back.projects[0].input, back.projects[0].snapshot).net)).toBe(132.22)
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

describe('stopnje', () => {
  const s = defaultSettings()
  const t = (mode: 'stranka' | 'prijatelj' | 'zase') => calculate({ ...demoJob(), mode }, s)
  it('izpis', () => { for (const m of ['stranka', 'prijatelj', 'zase'] as const) { const x = t(m); console.log(m, JSON.stringify({ stroski: r2(x.printCost), tisk: r2(x.printSale), storitve: r2(x.services), skupaj: r2(x.net), kos: r2(x.net / 4) })) } })
  it('zase = samo stroški', () => expect(t('zase').printSale).toBeCloseTo(t('zase').printCost))
  it('prijatelj €/h je nastavitev', () => {
    const s2 = { ...s, rates: { ...s.rates, friendPrintHourly: 2 } }
    const a = calculate({ ...demoJob(), mode: 'prijatelj' }, s2)
    expect(a.printSale).toBeCloseTo(a.printCost + a.printHours * 2)
  })
})

describe('datoteka zraven tiska', () => {
  const s = defaultSettings()
  const f = (kind: 'none' | 'stl' | 'step', mode: 'stranka' | 'prijatelj' | 'zase' = 'stranka') => calculate({ ...demoJob(), mode, fileSale: { kind } }, s)
  it('izpis', () => { for (const k of ['stl', 'step'] as const) for (const m of ['stranka', 'prijatelj', 'zase'] as const) { const x = f(k, m); console.log('FILE', k, m, JSON.stringify({ datoteka: r2(x.digital), storitve: r2(x.services), skupaj: r2(x.net), kos: r2(x.perPiece) })) } })
  it('STL 15 / STEP 30, storitve normalno', () => {
    expect(f('stl').digital).toBe(15); expect(f('step').digital).toBe(30)
    expect(r2(f('step').services)).toBe(61.25)
    expect(r2(f('step').net)).toBe(162.22)
  })
  it('prijatelj -15 %, zase 0', () => { expect(r2(f('step', 'prijatelj').digital)).toBe(25.5); expect(f('stl', 'zase').digital).toBe(0) })
  it('doplačilo je nastavitev', () => expect(calculate({ ...demoJob(), fileSale: { kind: 'stl' } }, { ...s, rates: { ...s.rates, fileAddonStl: 20 } }).digital).toBe(20))
  it('stari shranjeni posli se naložijo', () => {
    const old = structuredClone(s) as unknown as { rates: Record<string, number> }; delete old.rates.fileAddonStl; delete old.rates.fileAddonStep; old.rates.repeatSalePct = 30
    const st = normalize({ settings: old as never, projects: [], current: { ...demoJob(), fileSale: { kind: 'step', context: 'ponovna', override: 5 } as never } })
    expect(st.settings.rates.fileAddonStl).toBe(15)
    expect('repeatSalePct' in st.settings.rates).toBe(false)
    expect(calculate(st.current, st.settings).digital).toBe(30)
  })
  it('ročne digitalne postavke še delujejo', () => {
    const j = demoJob(); j.digital.raw = { on: true, hours: 1, rate: 20, extra: 5 }
    expect(calculate(j, s).digital).toBe(25)
  })
})

describe('nov projekt', () => {
  it('prazen projekt: vnosi 0, 1 kos, brez datoteke, nastavitve ostanejo', () => {
    const st0 = initialState(); st0.settings.rates.scan = 33
    const st = startBlank(st0)
    const j = st.current
    expect([j.name, j.client, j.pieces, j.gramsPerPiece, j.hoursPerPiece, j.minutesPerPiece, j.km, j.scanH, j.cadH, j.fileSale.kind]).toEqual(['', '', 1, 0, 0, 0, 0, 0, 0, 'none'])
    expect(st.settings.rates.scan).toBe(33); expect(st.settings.materials.length).toBe(st0.settings.materials.length); expect(st.currentId).toBeNull()
    expect(hasUnsaved(st)).toBe(false)
    expect(hasUnsaved({ ...st, current: { ...j, km: 5 } })).toBe(true)
  })
  it('datoteka privzeto Brez', () => expect(emptyJob().fileSale.kind).toBe('none'))
})

describe('migracija cenika v3', () => {
  it('posodobi samo stare privzete vrednosti', () => {
    const old = defaultSettings()
    delete old.ratesVersion
    old.rates = { ...old.rates, scan: 25, edit: 20, cad: 25, reverse: 30, prep: 22, markupPct: 50 }
    const st = normalize({ settings: old, projects: [] })
    expect(st.settings.rates).toMatchObject({ scan: 20, edit: 15, cad: 20, reverse: 25, prep: 22, markupPct: 100, km: 0.3, minOrder: 15, reservePct: 10, friendDiscountPct: 15 })
    const again = normalize({ settings: { ...st.settings, rates: { ...st.settings.rates, scan: 25 } }, projects: [] })
    expect(again.settings.rates.scan).toBe(25)
  })
})
