import { describe, it, expect, vi } from 'vitest'
vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
import { initialState, newProject } from './store'
import { businessInsights } from './businessInsights'

describe('pregled poslovanja', () => {
  it('ločuje označeno plačilo od ocen in šteje več materialov na isti plošči', () => {
    const s = initialState(), p = newProject(s.current, s.settings)
    const a = p.snapshot.materials[0], b = p.snapshot.materials[1]
    p.snapshot.rates.wastePct = 0
    p.status = 'placano'; p.input.usePlates = true; p.input.extraMaterialG = 0
    p.input.plates = [{ hours: 2, minutes: 0, grams: 100, materialId: a.id, additionalMaterials: [{ role: 'support', grams: 20, materialId: b.id }] }]
    p.actual = { printHours: 1.9, grams: 125, laborHours: 1 }
    const report = businessInsights([p])
    expect(report.printers[0].hours).toBe(2)
    expect(report.materials.find(x => x.id === a.id)?.grams).toBe(100)
    expect(report.materials.find(x => x.id === b.id)?.grams).toBe(20)
    expect(report.actualPrint).toBe(1.9)
    expect(report.actualMaterialCount).toBe(1)
    expect(report.paidValue).toBeGreaterThan(0)
    p.status = 'sprejeto'
    expect(businessInsights([p]).paidValue).toBe(0)
  })
})
