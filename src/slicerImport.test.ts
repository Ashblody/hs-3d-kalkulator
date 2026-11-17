import { describe, expect, it } from 'vitest'
import { readSlicerGcode } from './slicerImport'

describe('predogled besedilne G-kode', () => {
  it('prebere podatke PrusaSlicer in zaokroži čas navzgor', () => {
    expect(readSlicerGcode('; filament used [g] = 23.45\n; estimated printing time (normal mode) = 1h 22m 1s')).toMatchObject({ minutes: 83, grams: 23.45, multipleWeights: false })
  })
  it('uporabi skupni ocenjeni čas Bambu namesto krajšega časa modela', () => {
    const p = readSlicerGcode('; model printing time: 1h 2m 2s; total estimated time: 1h 8m 3s\n; total filament used [g] = 46.7')
    expect(p.minutes).toBe(69); expect(p.grams).toBe(46.7); expect(p.timeSource).toBe('skupni ocenjeni čas')
  })
  it('ne sklepa o masi, kadar je zapisanih več materialov', () => {
    expect(readSlicerGcode('; filament used [g] = 12.0, 8.2')).toMatchObject({ grams: null, multipleWeights: true })
  })
  it('ne izmišlja manjkajočih podatkov in ne sprejme kode kot komentarja', () => {
    expect(readSlicerGcode('G1 X3 Y4\n; filament used [mm] = 1000')).toMatchObject({ minutes: null, grams: null })
    expect(readSlicerGcode('G1 ; filament used [g] = 42')).toMatchObject({ grams: null })
  })
})
