// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { calculate, effSettings } from './calc'
import { quickCalc, quickDefaults } from './quick'
import { defaultSettings, emptyJob } from './seed'
import { normalize } from './store'

describe('zaokroževanje (globalno)', () => {
  it('privzeto 1 €', () => expect(defaultSettings().rates.roundTo).toBe(1))
  it('Hitri: brez / 1 € / 5 €', () => {
    const q = { ...quickDefaults, printH: 18.8, grams: 768, workH: 3.5 }
    expect(quickCalc({ ...q, roundTo: 0 }).total).toBe(151.16)
    expect(quickCalc({ ...q, roundTo: 1 }).total).toBe(152)
    expect(quickCalc({ ...q, roundTo: 5 }).total).toBe(155)
    expect(quickCalc({ ...q, roundTo: 1 }).business).toBe(303)
  })
  it('cenik stranke ne povozi zaokroževanja', () => {
    const s = defaultSettings(); const j = { ...emptyJob(s.rates), rateOverride: { roundTo: 5 } }
    expect(effSettings(j, s).rates.roundTo).toBe(1)
  })
  it('migracija: stari posnetki projektov 5 € → 1 €', () => {
    const s = defaultSettings(); s.ratesVersion = 7
    const snap = defaultSettings(); snap.rates.roundTo = 5
    const out = normalize({ settings: s, projects: [{ id: 'x', input: emptyJob(s.rates), snapshot: snap, status: 'ponudba' } as never] })
    expect(out.projects[0].snapshot.rates.roundTo).toBe(1)
    expect(calculate(out.projects[0].input, out.projects[0].snapshot).rounding).toBeLessThan(1)
  })
})
