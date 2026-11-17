import { describe, expect, it } from 'vitest'
import { calculate } from './calc'
import { defaultSettings, demoJob } from './seed'
import { quickToProject, quickDefaults, quickCalc } from './quick'

describe('strojna ura po tiskalniku', () => {
  it('stari cenik in shranjeni posnetek ostaneta nespremenjena', () => {
    const settings = defaultSettings()
    const job = demoJob()
    const snapshot = structuredClone(settings)
    const before = calculate(job, snapshot)
    settings.printers.find(p => p.id === job.printerId)!.printHourly = 5
    const after = calculate(job, settings)
    expect(before.printRate).toBe(3.5)
    expect(after.printRate).toBe(5)
    expect(after.printSale - before.printSale).toBeCloseTo(before.printHours * 1.5)
    expect(after.realCosts).toBeCloseTo(before.realCosts)
    expect(calculate(job, snapshot)).toEqual(before)
  })

  it('upošteva cenik stranke in dovoljuje ničelno postavko', () => {
    const s = defaultSettings(); const j = demoJob()
    s.printers.find(p => p.id === j.printerId)!.printHourly = 5
    expect(calculate({ ...j, rateOverride: { printHourly: 0 } }, s).printRate).toBe(0)
    expect(calculate({ ...j, rateOverride: { printHourly: 7 } }, s).printRate).toBe(7)
    expect(calculate({ ...j, rateOverride: { printHourly: -1 } }, s).printRate).toBe(5)
  })

  it('hitri izračun ob shranitvi ohrani vneseno postavko', () => {
    const s = defaultSettings()
    s.printers[0].printHourly = 9
    const q = { ...quickDefaults, printH: 3, grams: 100, printRate: 2, roundTo: 0 }
    const { input, snapshot } = quickToProject(q, 'Preizkus', s)
    expect(calculate(input, snapshot).printRate).toBe(2)
    expect(calculate(input, snapshot).gross).toBeCloseTo(quickCalc(q).total)
    expect(s.printers[0].printHourly).toBe(9)
  })
})
