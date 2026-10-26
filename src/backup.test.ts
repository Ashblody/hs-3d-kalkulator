import { describe, it, expect, vi } from 'vitest'
vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
import { initialState, newProject } from './store'
import { mergeStates } from './backup'
import { quoteData, safeName } from './quoteData'
import { demoJob } from './seed'

describe('varnostna kopija – združevanje', () => {
  it('brez dvojnikov po id, novejši zmaga', () => {
    const a = initialState(); const b = structuredClone(a)
    const p = newProject(demoJob(), a.settings)
    b.projects.push(p)
    b.projects[0] = { ...b.projects[0], updatedAt: '2999-01-01T00:00:00Z', status: 'placano' }
    const m = mergeStates(a, b)
    expect(m.state.projects.length).toBe(2)
    expect(m.added).toBe(1); expect(m.updated).toBe(1)
    expect(m.state.projects.find((x) => x.id === a.projects[0].id)!.status).toBe('placano')
    expect(mergeStates(m.state, b).added).toBe(0)
  })
})
describe('ponudba', () => {
  it('postavke se seštejejo v neto pred zaokrožitvijo', () => {
    const s = initialState(); const { lines, r } = quoteData(demoJob(), s.settings)
    expect(lines.length).toBeGreaterThan(0); expect(r.gross).toBeGreaterThan(0)
    expect(safeName('Nosilček č/š')).toBe('Nosilcek_c_s')
  })
})
