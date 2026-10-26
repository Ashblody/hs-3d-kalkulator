import { describe, it, expect } from 'vitest'
import { calculate } from './calc'
import { quickCalc, quickDefaults } from './quick'
import { defaultSettings, emptyJob } from './seed'
describe('referenčni posel (20 h, 500 g PLA, 3,5 h dela)', () => {
  it('Hitri = 150 €, Podroben ≈ 150 €', () => {
    const q = quickCalc({ ...quickDefaults, printH: 20, grams: 500, workH: 3.5, matKg: 20 })
    expect(q.total).toBeCloseTo(150, 1)
    const s = defaultSettings()
    const r = calculate({ ...emptyJob(), materialId: 'bb2-pla', pieces: 1, gramsPerPiece: 500, hoursPerPiece: 20, minutesPerPiece: 0, useBatchTime: false, usePlates: false, scanH: 1, editH: 1, cadH: 1, prepH: 0.5 }, s)
    console.log('PODROBEN', r.gross, r.realCosts, r.profit)
    expect(Math.abs(r.gross - 150)).toBeLessThan(8)
  })
})
