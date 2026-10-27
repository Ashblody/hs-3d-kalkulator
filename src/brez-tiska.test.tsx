// @vitest-environment jsdom
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any
import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { useState } from 'react'
import Calculator from './Calculator'
import Quick from './Quick'
import ProjectsView from './ProjectsView'
import { calculate, validateJob, jobFloor } from './calc'
import { defaultSettings, demoJob, emptyJob } from './seed'
import { quickCalc, quickDefaults, quickToProject, quickText, jobText, quickFloor } from './quick'
import { quoteData } from './quoteData'
import { normalize, initialState } from './store'
import type { JobInput, Project, Settings } from './types'

const S = (): Settings => defaultSettings()
const scanJob = (extra: Partial<JobInput> = {}): JobInput => ({ ...demoJob(), mode: 'osebno', printing: false, ...extra })

describe('Brez tiska: izračun', () => {
  it('stari projekti (brez polja) se računajo s tiskom, enako kot printing=true', () => {
    const s = S(); const j = demoJob(); expect(j.printing).toBeUndefined()
    expect(calculate({ ...j, printing: true }, s)).toEqual(calculate(j, s))
    expect(calculate(j, s).material).toBeGreaterThan(0)
  })
  it('izklop tiska: ničesar od tiska, delo ostane', () => {
    const s = S(); const j = scanJob()
    const on = calculate({ ...j, printing: true }, s), off = calculate(j, s)
    for (const k of ['printHours', 'kg', 'material', 'electricity', 'wear', 'adhesive', 'consumables', 'reserve', 'printCost', 'printSale', 'markup'] as const) expect(off[k], k).toBe(0)
    expect(off.laborHours).toBe(on.laborHours)
    expect(off.servicesStandard).toBe(on.servicesStandard)
    expect(off.realCosts).toBe(0)
    expect(off.net).toBeGreaterThan(0)
    expect(off.net).toBeLessThan(on.net)
    expect(off.perPiece).toBe(off.gross)
  })
  it('ročni strošek tiska, plošče in grami se ob izklopu ignorirajo', () => {
    const s = S(); const j = scanJob({ printCostOverride: 50, usePlates: true, plates: [{ hours: 3, minutes: 0, grams: 200, materialId: 'bambu-pla' }], reservePct: 30, consumables: 9 })
    const r = calculate(j, s); expect(r.printSale).toBe(0); expect(r.printCost).toBe(0); expect(r.kg).toBe(0)
    expect(r.net).toBe(calculate(scanJob(), s).net)
  })
  it('samo skeniranje: delo + minimalno naročilo + zaokroževanje še vedno delujejo', () => {
    const s = S(); const base = emptyJob(s.rates)
    const tiny = calculate({ ...base, printing: false, scanH: 0.25 }, s)
    expect(tiny.subtotal).toBeLessThan(s.rates.minOrder); expect(tiny.minOrderApplied).toBe(true); expect(tiny.net).toBe(s.rates.minOrder)
    const one = calculate({ ...base, printing: false, scanH: 1.5, cadH: 0.5 }, s)
    expect(one.minOrderApplied).toBe(false)
    expect(one.net).toBe(Math.ceil(one.netBeforeRounding / s.rates.roundTo) * s.rates.roundTo)
    expect(calculate({ ...base, printing: false }, s).net).toBe(0)
  })
  it('spodnja meja brez tiska = strošek + delo, brez NaN', () => {
    const s = S(); const r = calculate(scanJob(), s); const f = jobFloor(r, s)
    expect(f.floor).toBeGreaterThanOrEqual(r.servicesStandard); expect(Object.values(f).every(Number.isFinite)).toBe(true)
    expect(f.safe).toBe(f.floor)
  })
  it('validacija ne javlja napak v skritih poljih tiska', () => {
    expect(validateJob({ ...scanJob(), minutesPerPiece: 99, gramsPerPiece: -4 })).toEqual([])
    expect(validateJob({ ...demoJob(), minutesPerPiece: 99 }).length).toBeGreaterThan(0)
  })
  it('polje printing preživi normalize (Drive sync) in ga stari podatki nimajo', () => {
    const st = initialState(); st.current = scanJob(); st.projects = [{ id: 'a', status: 'sprejeto', createdAt: '', updatedAt: '', input: scanJob(), snapshot: st.settings, actual: { printHours: 0, grams: 0, laborHours: 0 } } as unknown as Project]
    const n = normalize(JSON.parse(JSON.stringify(st)))
    expect(n.projects[0].input.printing).toBe(false); expect(n.current.printing).toBe(false)
    const old = JSON.parse(JSON.stringify(initialState())); delete old.current.printing
    expect(normalize(old).current.printing).toBeUndefined()
  })
})

describe('Brez tiska: ponudba in besedila', () => {
  it('ponudba ima samo storitve, brez 3D-tiska in gramov', () => {
    const q = quoteData(scanJob({ cadH: 1 }), S())
    expect(q.lines.some(([l]) => /3D-tisk –/.test(l))).toBe(false)
    expect(q.lines.map(([l]) => l)).toEqual(expect.arrayContaining(['3D-skeniranje', 'Urejanje skena', 'Modeliranje / CAD / reverse engineering']))
    expect(JSON.stringify(q.lines)).not.toMatch(/ g\b|h tiska/)
    expect(q.lines.map(([l]) => l)).toContain('Priprava in dodelava')
    expect(q.rights).toMatch(/storitev/)
    expect(quoteData(demoJob(), S()).lines.some(([l]) => /3D-tisk –/.test(l))).toBe(true)
  })
  it('XLSX in PDF se zgradita brez tiska', async () => {
    const { buildXlsx } = await import('./exporters')
    const blob = await buildXlsx(scanJob(), S(), 'abcd1234')
    const XLSX = await import('xlsx')
    const wb = XLSX.read(await blob.arrayBuffer(), { type: 'array' })
    const txt = JSON.stringify(XLSX.utils.sheet_to_json(wb.Sheets['Ponudba'], { header: 1 })) + JSON.stringify(XLSX.utils.sheet_to_json(wb.Sheets['Razčlenitev'], { header: 1 }))
    expect(txt).not.toMatch(/Material|Elektrika|Obraba|Ur tiska|Tisk /)
    expect(txt).toMatch(/Moje delo/)
  })
  it('jobText brez vrstic tiska in materiala', () => {
    const t = jobText(scanJob(), S()); expect(t).not.toMatch(/Tiskanje|Material/); expect(t).toMatch(/Delo:/)
  })
})

describe('Brez tiska: Hitri', () => {
  it('quickCalc: samo delo (+ pribitek)', () => {
    const q = { ...quickDefaults, printH: 3, grams: 100, workH: 2, workRate: 20, markupPct: 10, printing: false }
    const r = quickCalc(q); expect(r.print).toBe(0); expect(r.material).toBe(0); expect(r.work).toBe(40); expect(r.exact).toBe(44)
    expect(quickCalc({ ...q, printing: true }).print).toBeGreaterThan(0)
    expect(quickCalc({ ...q, printing: undefined }).print).toBeGreaterThan(0)
    expect(quickText(q)).not.toMatch(/Tiskanje|Material/)
  })
  it('quickToProject brez tiska da isto ceno kot Hitri; s tiskom ostane brez polja', () => {
    const s = S(); const q = { ...quickDefaults, printH: 3, grams: 100, workH: 2, workRate: 20, markupPct: 10, printing: false, roundTo: s.rates.roundTo }
    const p = quickToProject(q, 'x', s); expect(p.input.printing).toBe(false)
    const r = calculate(p.input, p.snapshot); expect(r.net).toBe(quickCalc(q).total); expect(r.printSale).toBe(0)
    expect('printing' in quickToProject({ ...q, printing: true }, 'x', s).input).toBe(false)
    expect(Object.values(quickFloor(q, s)).every(Number.isFinite)).toBe(true)
  })
})

describe('Brez tiska: vmesnik', () => {
  function Wrap({ init }: { init: JobInput }) { const [j, setJ] = useState(init); return <Calculator job={j} settings={S()} onChange={setJ} /> }
  it('Podroben: kljukica Tisk skrije polja tiska in vrstice tiska/materiala', () => {
    cleanup(); render(<Wrap init={{ ...demoJob(), scanH: 1 }} />)
    expect(screen.getByText('Tiskalnik')).toBeTruthy(); expect(document.body.textContent).toMatch(/Material \d/)
    fireEvent.click(screen.getByLabelText(/^Tisk \(odkljukaj/))
    expect(screen.queryByText('Tiskalnik')).toBeNull(); expect(screen.queryByText('Teža kosa')).toBeNull()
    expect(document.body.textContent).not.toMatch(/Material \d|Elektrika|Obraba tiskalnika|Moj strošek tiska|0 g/)
    expect(document.body.textContent).toMatch(/Moje delo/); expect(document.body.textContent).not.toMatch(/NaN|Infinity/)
    fireEvent.click(screen.getByLabelText(/^Tisk \(odkljukaj/)); expect(screen.getByText('Tiskalnik')).toBeTruthy()
  })
  it('Hitri: kljukica Tisk skrije polja in cena je samo delo', () => {
    cleanup(); localStorage.clear()
    render(<Quick settings={S()} flash={() => {}} onSave={() => {}} customers={[]} projects={[]} onCreateCustomer={() => {}} />)
    fireEvent.click(screen.getByLabelText(/^Tisk \(odkljukaj/))
    expect(screen.queryByText('Čas tiskanja')).toBeNull(); expect(screen.queryByText('Teža materiala')).toBeNull()
    expect(document.body.textContent).not.toMatch(/Material \d|Tiskanje \d/)
  })
  it('Projekti: kartica brez tiska ne kaže gramov', () => {
    const s = S(); const p = { id: 'a', status: 'sprejeto', createdAt: '', updatedAt: '', input: scanJob(), snapshot: s, actual: { printHours: 0, grams: 0, laborHours: 0 } } as unknown as Project
    cleanup(); render(<ProjectsView projects={[p]} currentId={null} onOpen={() => {}} onCopy={() => {}} onDelete={() => {}} onStatus={() => {}} onActual={() => {}} onPdf={() => {}} onExport={() => {}} />)
    expect(document.body.textContent).toMatch(/brez tiska · [\d,]+ h dela/); expect(document.body.textContent).not.toMatch(/ g · | h tiska/)
  })
})

import Dashboard from './Dashboard'
describe('Brez tiska: Posel', () => {
  it('projekt brez tiska šteje v prihodke, brez NaN', () => {
    const s = S(); const d = new Date(); const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-05`
    const input = { ...scanJob({ cadH: 1 }), date }
    const p = { id: 'a', status: 'sprejeto', createdAt: date, updatedAt: date, input, snapshot: s, actual: { printHours: 0, grams: 0, laborHours: 0 } } as unknown as Project
    cleanup(); render(<Dashboard projects={[p]} settings={s} />)
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/)
    expect(document.body.textContent).toContain(calculate(input, s).net.toLocaleString('sl-SI', { minimumFractionDigits: 2 }))
  })
})
