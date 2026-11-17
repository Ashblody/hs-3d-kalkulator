import { describe, expect, it } from 'vitest'
import { calculate, plateGrams } from './calc'
import { defaultSettings, demoJob } from './seed'

describe('več materialov na plošči', () => {
  it('izračuna vsak material posebej, čas in število plošč pa samo enkrat', () => {
    const s = defaultSettings()
    s.rates.wastePct = 0
    const a = s.materials[0], b = s.materials[1]
    a.prices = [{ label: 'Redna', price: 20 }]; a.spoolG = 1000; a.adhesive = 0
    b.prices = [{ label: 'Redna', price: 40 }]; b.spoolG = 1000; b.adhesive = 0
    const p = { hours: 2, minutes: 30, grams: 100, materialId: a.id, additionalMaterials: [{ role: 'interface' as const, materialId: b.id, grams: 50 }] }
    const j = { ...demoJob(), materialId: a.id, usePlates: true, plates: [p], pieces: 4, extraMaterialG: 0 }
    const result = calculate(j, s)
    expect(plateGrams(p)).toBe(150)
    expect(result.kg).toBeCloseTo(0.15)
    expect(result.material).toBeCloseTo(4)
    expect(result.printHours).toBe(2.5)
    expect(result.printSale).toBeCloseTo(2.5 * result.printRate + 4 + result.consumables + result.otherDirect)
  })
  it('stara plošča brez dodatnih materialov ohrani izračun', () => {
    const s = defaultSettings(), j = demoJob()
    const p = { hours: 1, minutes: 30, grams: 80, materialId: s.materials[0].id }
    const old = { ...j, usePlates: true, plates: [p], extraMaterialG: 0 }
    expect(calculate(old, s)).toEqual(calculate({ ...old, plates: [{ ...p, additionalMaterials: [] }] }, s))
  })
})
