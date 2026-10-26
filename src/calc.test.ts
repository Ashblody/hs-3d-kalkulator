import { describe, it, expect } from 'vitest'
import { calculate, fileSaleInfo, markupToMargin, r2, totalPrintHours, wearPerHour } from './calc'
import { defaultSettings, demoJob , emptyJob } from './seed'

/** brez zaokroževanja – za preverjanje točnih zneskov */
const noRound = () => { const s = defaultSettings(); s.rates.roundTo = 0; return s }

describe('demo projekt Nosilci lučk', () => {
  const s = noRound()
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
  it('tisk = 3,5 €/h + material + potrošni', () => expect(res.printSale).toBeCloseTo(18.8 * 3.5 + res.material + 3.4, 10))
  it('delo 3,5 h × 20 = 70', () => expect(r2(res.services)).toBe(70))
  it('končna cena z računom = (tisk + delo) × 2', () => {
    expect(res.net).toBeCloseTo((res.printSale + 70) * 2, 10)
    expect(r2(res.net)).toBe(319.32)
  })
  it('izpis točnih vrednosti', () => {
    console.log(JSON.stringify({ material: r2(res.material), elektrika: r2(res.electricity), amortizacija: r2(res.wear), rezerva: r2(res.reserve), strosekTiska: r2(res.printCost), prodajaTiska: r2(res.printSale), storitve: r2(res.services), koncna: r2(res.net) }))
  })
})

describe('pravila', () => {
  const s = noRound()
  it('pribitek ni marža', () => expect(r2(markupToMargin(50))).toBe(33.33))
  it('skupen čas serije se ne množi s kosi', () => {
    const j = { ...demoJob(), useBatchTime: true, batchHours: 10, batchMinutes: 30 }
    expect(totalPrintHours(j)).toBe(10.5)
  })
  it('na roke vs z računom: celota × 2', () => {
    const j = { ...demoJob(), mode: 'prijatelj' as const, invoice: false, km: 10 }
    const a = calculate(j, s), b = calculate({ ...j, invoice: true }, s)
    expect(b.net).toBeCloseTo(a.net * 2)
    expect(a.services).toBeCloseTo(70)
  })
  it('zase: samo stroški, čas informativno', () => {
    const a = calculate({ ...demoJob(), mode: 'zase' }, s)
    expect(a.net).toBeCloseTo(a.printCost)
    expect(r2(a.timeValue)).toBe(70)
  })
  it('minimalno naročilo', () => {
    const a = calculate({ ...demoJob(), scanH: 0, editH: 0, cadH: 0, prepH: 0, finishH: 0, pieces: 1, gramsPerPiece: 5, hoursPerPiece: 0, minutesPerPiece: 20, consumables: 0 }, s)
    expect(a.net).toBe(15)
  })
  it('DDV ločen', () => {
    const s2 = noRound(); s2.business.vatEnabled = true
    const a = calculate(demoJob(), s2)
    expect(a.gross).toBeCloseTo(a.net * 1.22)
  })
  it('ročna sprememba stroškov', () => {
    const a = calculate({ ...demoJob(), printCostOverride: 40 }, s)
    expect(a.printSale).toBeCloseTo(40 + 18.8 * 3.5)
  })
})

import { normalize, initialState , startBlank, hasUnsaved , duplicateProject } from './store'
describe('varnostna kopija', () => {
  it('izvoz/uvoz ohrani podatke', () => {
    ;(globalThis as any).window = { matchMedia: () => ({ matches: false }) }
    const s = initialState()
    const back = normalize(JSON.parse(JSON.stringify(s)))
    expect(back.projects[0].input.name).toBe('Nosilci lučk – 2 leva + 2 desna')
    expect(r2(calculate(back.projects[0].input, back.projects[0].snapshot).net)).toBe(320)
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
  const s = noRound()
  const t = (mode: 'stranka' | 'prijatelj' | 'zase') => calculate({ ...demoJob(), mode }, s)
  it('izpis', () => { for (const m of ['stranka', 'prijatelj', 'zase'] as const) { const x = t(m); console.log(m, JSON.stringify({ stroski: r2(x.printCost), tisk: r2(x.printSale), storitve: r2(x.services), skupaj: r2(x.net), kos: r2(x.net / 4) })) } })
  it('zase = samo stroški', () => expect(t('zase').printSale).toBeCloseTo(t('zase').printCost))
  it('domači: stroški + €/h tiska, delo po nastavitvi (privzeto 0)', () => {
    const a = calculate({ ...demoJob(), mode: 'domaci' }, s)
    expect(a.printSale).toBeCloseTo(a.printCost + a.printHours * 1); expect(a.services).toBe(0)
    const s2 = { ...s, rates: { ...s.rates, friendPrintHourly: 2, familyLabourPct: 50 } }
    const b = calculate({ ...demoJob(), mode: 'domaci' }, s2)
    expect(b.printSale).toBeCloseTo(b.printCost + b.printHours * 2); expect(b.services).toBeCloseTo(35)
  })
})

describe('datoteka zraven tiska', () => {
  const s = noRound()
  const f = (kind: 'none' | 'stl' | 'step', mode: 'stranka' | 'prijatelj' | 'zase' = 'stranka') => calculate({ ...demoJob(), mode, fileSale: { kind } }, s)
  it('izpis', () => { for (const k of ['stl', 'step'] as const) for (const m of ['stranka', 'prijatelj', 'zase'] as const) { const x = f(k, m); console.log('FILE', k, m, JSON.stringify({ datoteka: r2(x.digital), storitve: r2(x.services), skupaj: r2(x.net), kos: r2(x.perPiece) })) } })
  it('STL 15 / STEP 30, storitve normalno', () => {
    expect(f('stl').digital).toBe(15); expect(f('step').digital).toBe(30)
    expect(r2(f('step').services)).toBe(70)
    expect(r2(f('step').net)).toBe(r2(f('none').net + 60))
  })
  it('prijatelj brez popusta, zase 0', () => { expect(r2(f('step', 'prijatelj').digital)).toBe(30); expect(f('stl', 'zase').digital).toBe(0) })
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

describe('zaokroževanje, plošče, statusi, podvoji', () => {
  it('privzeto navzgor na 5 €, prikaže razliko', () => {
    const r = calculate(demoJob(), defaultSettings())
    expect(r.net).toBe(320); expect(r2(r.rounding)).toBe(0.68); expect(r2(r.netBeforeRounding)).toBe(319.32)
    console.log('ROUND', JSON.stringify({ stl: calculate({ ...demoJob(), fileSale: { kind: 'stl' } }, defaultSettings()).net, step: calculate({ ...demoJob(), fileSale: { kind: 'step' } }, defaultSettings()).net }))
  })
  it('na 1 € in izklop; zase se ne zaokroži', () => {
    const s = defaultSettings(); s.rates.roundTo = 1
    expect(calculate(demoJob(), s).net).toBe(320)
    s.rates.roundTo = 0; expect(r2(calculate(demoJob(), s).net)).toBe(319.32)
    expect(r2(calculate({ ...demoJob(), mode: 'zase' }, defaultSettings()).net)).toBe(35.49)
    expect(calculate({ ...demoJob(), scanH: 0, editH: 0, cadH: 0, prepH: 0, finishH: 0, pieces: 1, gramsPerPiece: 5, hoursPerPiece: 0, minutesPerPiece: 20, consumables: 0 }, defaultSettings()).net).toBe(15)
  })
  it('plošče seštejejo čas in grame, material po plošči', () => {
    const s = noRound()
    const plates = { ...demoJob(), usePlates: true, plates: [{ hours: 9, minutes: 24, grams: 384, materialId: 'bambu-asa' }, { hours: 9, minutes: 24, grams: 384, materialId: 'bambu-asa' }] }
    const a = calculate(plates, s), b = calculate(demoJob(), s)
    expect(a.printHours).toBeCloseTo(b.printHours); expect(a.kg).toBeCloseTo(b.kg); expect(r2(a.net)).toBe(r2(b.net))
    const mixed = calculate({ ...plates, plates: [plates.plates[0], { ...plates.plates[1], materialId: 'bambu-pla' }] }, s)
    expect(mixed.material).not.toBeCloseTo(a.material)
  })
  it('statusi: migracija in nov projekt Ponudba', () => {
    const st0 = initialState()
    const st = normalize({ ...st0, projects: [{ ...st0.projects[0], status: 'zakljuceno' }, { ...st0.projects[0], id: 'x', status: undefined }] })
    expect(st.projects.map((p) => p.status)).toEqual(['natisnjeno', 'ponudba'])
    expect(initialState().projects[0].status).toBe('ponudba')
  })
  it('podvoji projekt', () => {
    const st = initialState(); const c = duplicateProject(st.projects[0], st.settings)
    expect(c.input.name).toBe(st.projects[0].input.name + ' (kopija)'); expect(c.id).not.toBe(st.projects[0].id); expect(c.status).toBe('ponudba')
  })
})

import { allTiers } from './calc'
describe('šefov model: referenčni posel 5 h, 800 g, 3,5 h dela', () => {
  const ref = (materialId: string) => ({ ...emptyJob(), materialId, pieces: 1, gramsPerPiece: 800, hoursPerPiece: 5, scanH: 1, editH: 1, cadH: 1, prepH: 0.5 })
  for (const m of ['bb2-pla', 'bb2-asa']) it('izpis ' + m, () => {
    const t = allTiers(ref(m), defaultSettings())
    console.log('REF', m, JSON.stringify(Object.fromEntries(Object.entries(t).map(([k, r]) => [k, { mat: r2(r.material), tisk: r2(r.printSale), stroski: r2(r.printCost), delo: r2(r.services), pred: r2(r.netBeforeRounding), cena: r2(r.net) }]))))
  })
  it('PLA: na roke 105 €, z računom 205 €', () => {
    const t = allTiers(ref('bb2-pla'), defaultSettings())
    expect(r2(t.naroke.netBeforeRounding)).toBe(101.09); expect(t.naroke.net).toBe(105); expect(t.racun.net).toBe(205)
    expect(t.racun.net).toBe(Math.ceil(t.naroke.netBeforeRounding * 2 / 5) * 5); expect(t.domaci.services).toBe(0)
  })
  it('migracija: 36 → 20, lastna vrednost ostane', () => {
    const o = defaultSettings(); o.ratesVersion = 4; o.rates.labourHourly = 36
    expect(normalize({ settings: o, projects: [] }).settings.rates.labourHourly).toBe(20)
    const o2 = defaultSettings(); o2.ratesVersion = 4; o2.rates.labourHourly = 30
    expect(normalize({ settings: o2, projects: [] }).settings.rates.labourHourly).toBe(30)
  })
})
