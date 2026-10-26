// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { calculate } from './calc'
import { defaultSettings, demoJob, emptyJob } from './seed'
import { mergeLegacy } from './store'

describe('v9: lepilo in združena polja', () => {
  const s = defaultSettings()
  it('ASA dobi lepilo, PLA ne', () => {
    expect(s.materials.find((m) => m.id === 'bambu-asa')?.adhesive).toBe(0.5)
    expect(s.materials.find((m) => m.id === 'bambu-pla')?.adhesive).toBe(0)
    const asa = calculate({ ...demoJob(), mode: 'osebno' }, s)
    expect(asa.adhesive).toBe(0.5); expect(asa.adhesiveLabel).toBe('ASA')
    const pla = calculate({ ...demoJob(), materialId: 'bambu-pla' }, s)
    expect(pla.adhesive).toBe(0)
  })
  it('migracija ohrani ceno', () => {
    const old = { ...demoJob(), materialId: 'bambu-pla', extraMaterialG: 40, reverseH: 1, finishH: 0.5, packaging: 2, delivery: 3, otherDirect: 1 }
    const m = mergeLegacy(old)
    expect(m.extraMaterialG).toBe(0); expect(m.reverseH).toBe(0); expect(m.finishH).toBe(0)
    expect(m.cadH).toBe(old.cadH + 1); expect(m.prepH).toBe(old.prepH + 0.5); expect(m.otherCosts).toBe(old.otherCosts + 5)
    expect(calculate(m, s).net).toBeCloseTo(calculate(old, s).net)
    expect(emptyJob().extraMaterialG).toBe(0)
  })
})

import { jobFloor } from './calc'
describe('spodnja meja', () => {
  it('768 g ASA, 18,8 h, 3,5 h', () => {
    const s = defaultSettings()
    expect(jobFloor(calculate(demoJob(), s), s)).toEqual({ own: 35.49, floor: 106, floorBiz: 211, safe: 132, safeBiz: 263 })
  })
})
