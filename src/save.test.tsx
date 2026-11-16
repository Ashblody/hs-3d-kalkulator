// @vitest-environment jsdom
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any
import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
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
  it('A → Nov projekt → B ustvari dva projekta; preimenovanje ne prepiše', async () => {
    cleanup(); localStorage.clear()
    const App = (await import('./App')).default
    render(<App />)
    fireEvent.click(screen.getByText('Podroben'))
    const nameInp = () => screen.getByText('Ime projekta').parentElement!.querySelector('input')!
    const stored = () => JSON.parse(localStorage.getItem('hs3d-kalkulator-v1')!) as AppState
    fireEvent.change(nameInp(), { target: { value: 'parket' } })
    fireEvent.click(screen.getByText('Shrani kot nov projekt'))
    expect(screen.getByTestId('editing').textContent).toContain('parket')
    fireEvent.click(screen.getByText('Nov projekt'))
    fireEvent.change(nameInp(), { target: { value: 'B' } })
    fireEvent.click(screen.getByText('Shrani kot nov projekt'))
    // brez Nov projekt: samo spremeni ime in shrani → še en nov projekt
    fireEvent.change(nameInp(), { target: { value: 'C' } })
    fireEvent.click(screen.getByText('Shrani kot nov projekt'))
    const s = stored(); const ids = ['parket', 'B', 'C'].map((n) => named(s, n).map((p) => p.id))
    expect(ids.map((x) => x.length)).toEqual([1, 1, 1]); expect(new Set(ids.flat()).size).toBe(3)
  })
})
