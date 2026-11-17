// @vitest-environment jsdom
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any
import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen, cleanup, within } from '@testing-library/react'
import { freshState, saveCurrent, startBlank, type AppState } from './store'
import { applySynced } from './DriveSync'
import { mergeStates } from './backup'

window.matchMedia ??= (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as any
const withName = (st: AppState, name: string): AppState => ({ ...st, current: { ...st.current, name } })
const named = (st: AppState, name: string) => st.projects.filter((p) => p.input.name === name)

describe('Shranjevanje nikoli ne prepiše drugega projekta', () => {
  it('shrani A → Nov projekt → shrani B: oba obstajata z različnim id', () => {
    let st = saveCurrent(withName(freshState(), 'parket'), false).state
    const a = named(st, 'parket')[0]
    st = startBlank(st); expect(st.currentId).toBeNull()
    st = saveCurrent(withName(st, 'B'), false).state
    const b = named(st, 'B')[0]
    expect(a.id).not.toBe(b.id); expect(named(st, 'parket')).toHaveLength(1); expect(named(st, 'parket')[0].input).toEqual(a.input)
  })
  it('odprt projekt z drugim imenom → nov projekt, stari ostane', () => {
    let st = saveCurrent(withName(freshState(), 'parket'), false).state
    const a = named(st, 'parket')[0]
    const r = saveCurrent(withName(st, 'omara'), false)
    expect(r.created).toBe(true); expect(named(r.state, 'parket')[0]).toEqual(a); expect(named(r.state, 'omara')[0].id).not.toBe(a.id)
  })
  it('isto ime → posodobi odprti projekt (urejanje)', () => {
    let st = saveCurrent(withName(freshState(), 'parket'), false).state
    const r = saveCurrent({ ...st, current: { ...st.current, pieces: 7 } }, false)
    expect(r.created).toBe(false); expect(named(r.state, 'parket')).toHaveLength(1); expect(named(r.state, 'parket')[0].input.pieces).toBe(7)
  })
  it('Shrani kot nov projekt z istim imenom → dva projekta', () => {
    let st = saveCurrent(withName(freshState(), 'parket'), false).state
    const r = saveCurrent(st, true)
    expect(named(r.state, 'parket')).toHaveLength(2)
  })
  it('sinhronizacija, ki se konča po shranjevanju, ne izbriše novega projekta', () => {
    const before = saveCurrent(withName(freshState(), 'parket'), false).state
    const remote = saveCurrent(withName(startBlank(before), 'iz telefona'), false).state
    const synced = mergeStates(before, remote).state // rezultat iz starega stanja
    const now = saveCurrent(withName(startBlank(before), 'B'), false).state // medtem shranjen B
    const out = applySynced(now, synced)
    expect(named(out, 'B')).toHaveLength(1); expect(named(out, 'iz telefona')).toHaveLength(1); expect(named(out, 'parket')).toHaveLength(1)
    expect(out.currentId).toBe(now.currentId)
  })
})

describe('App: gumbi', () => {
  it('shrani → prazen obrazec; odpri, uredi, shrani → posodobljen brez dvojnika', async () => {
    cleanup(); localStorage.clear()
    const App = (await import('./App')).default
    render(<App />)
    fireEvent.click(screen.getByText('Podroben'))
    const nameInp = () => screen.getByText('Ime projekta').parentElement!.querySelector('input')!
    const stored = () => JSON.parse(localStorage.getItem('hs3d-kalkulator-v1')!) as AppState
    fireEvent.change(nameInp(), { target: { value: 'parket' } })
    fireEvent.click(screen.getByText('Shrani kot nov projekt'))
    // po shranjevanju: prazen nov projekt, brez vezave
    expect(nameInp().value).toBe(''); expect(screen.queryByTestId('editing')).toBeNull(); expect(stored().currentId).toBeNull()
    fireEvent.change(nameInp(), { target: { value: 'B' } })
    fireEvent.click(screen.getByText('Shrani kot nov projekt'))
    // prazen obrazec se ne shrani
    const n0 = stored().projects.length
    fireEvent.click(screen.getByText('Shrani kot nov projekt')); expect(stored().projects.length).toBe(n0)
    // odpri parket, uredi, shrani → posodobljen, brez dvojnika, obrazec spet prazen
    fireEvent.click(screen.getByText('Projekti'))
    const card = screen.getByText('parket').closest('.card') as HTMLElement
    fireEvent.click(within(card).getByText('Odpri'))
    expect(screen.getByTestId('editing').textContent).toContain('parket')
    const kos = screen.getByText('Število kosov').parentElement!.querySelector('input')!
    fireEvent.focus(kos); fireEvent.change(kos, { target: { value: '4' } }); fireEvent.blur(kos)
    fireEvent.click(screen.getByText(/Shrani spremembe v/))
    expect(nameInp().value).toBe('')
    const s = stored(); expect(named(s, 'parket')).toHaveLength(1); expect(named(s, 'parket')[0].input.pieces).toBe(4); expect(named(s, 'B')).toHaveLength(1)
  })
})

import { toPodroben, hasUnsaved, newProject } from './store'
import { calculate } from './calc'
import { demoJob } from './seed'
describe('Podroben: brez Poslovno in brez skupnega časa serije', () => {
  it('star projekt s skupnim časom → čas na kos, enak skupni čas tiska', () => {
    const st = freshState()
    const old = { ...demoJob(), mode: 'osebno' as const, pieces: 4, useBatchTime: true, batchHours: 10, batchMinutes: 30 }
    const j = toPodroben(old)
    expect(j.useBatchTime).toBe(false); expect(j.hoursPerPiece).toBeCloseTo(10.5 / 4)
    expect(calculate(j, st.settings).printHours).toBeCloseTo(calculate(old, st.settings).printHours)
  })
  it('Poslovno → Osebno; nespremenjen job vrne isti objekt', () => {
    const j = { ...demoJob(), mode: 'poslovno' as const, useBatchTime: false }
    expect(toPodroben(j).mode).toBe('osebno')
    const o = toPodroben(j); expect(toPodroben(o)).toBe(o)
  })
  it('odprt star Poslovno projekt ne šteje kot neshranjen', () => {
    const st = freshState(); const p = newProject({ ...demoJob(), mode: 'poslovno' }, st.settings)
    expect(hasUnsaved({ ...st, projects: [p], currentId: p.id, current: toPodroben(p.input) })).toBe(false)
  })
  it('UI: ni stikala Poslovno ne kljukice za skupen čas', async () => {
    cleanup(); localStorage.clear()
    const App = (await import('./App')).default
    render(<App />); fireEvent.click(screen.getByText('Podroben'))
    expect(screen.queryByText('Vnesem skupen čas tiska za celo serijo')).toBeNull()
    expect(screen.queryAllByText(/^Poslovno/)).toHaveLength(0)
    expect(screen.getAllByText(/Osebno/).length).toBeGreaterThan(0)
  })
})
