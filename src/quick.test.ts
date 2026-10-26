import { describe, it, expect } from 'vitest'
import { quickCalc, quickText, quickDefaults, quickCompare, jobText } from './quick'
import { defaultSettings, demoJob } from './seed'
const ex = { ...quickDefaults, printH: 20, grams: 800, workH: 3.5 }
describe('Hitri izračun', () => {
  it('20 h / 800 g / 3,5 h / 20 €/kg = 156,00 €, 2× = 312,00 €', () => {
    const r = quickCalc(ex)
    expect([r.print, r.material, r.work, r.markup, r.total, r.business]).toEqual([70, 16, 70, 0, 156, 312])
  })
  it('pribitek na osnovo, brez zaokroževanja', () => {
    expect(quickCalc({ ...ex, markupPct: 10 }).total).toBe(171.6)
    expect(quickCalc({ ...ex, grams: 123 }).total).toBe(142.46)
  })
  it('besedilo za kopiranje', () => {
    const t = quickText({ ...ex, business: true })
    expect(t).toContain('Končna cena: 156,00 €'); expect(t).toContain('Z računom: 312,00 €'); expect(t).toContain('Tiskanje: 20 h')
  })
  it('primerjava s podrobnim', () => {
    const c = quickCompare(ex, defaultSettings())
    console.log('CMP', JSON.stringify(c))
    expect(c.detailed).toBe(154); expect(c.diff).toBe(-2)
  })
  it('povzetek projekta', () => {
    const t = jobText(demoJob(), defaultSettings())
    expect(t).toMatch(/Tiskanje: 18,8 h × 3,50 €\/h/); expect(t).toContain('Končna cena: 320,00 €')
  })
})
