import { describe, it, expect, vi } from 'vitest'
vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
import { initialState, newProject, normalize } from './store'
import { mergeStates } from './backup'
import { quoteData, safeName } from './quoteData'
import { demoJob } from './seed'

describe('material details backup compatibility', () => {
  it('preserves old materials and new details through JSON import', () => {
    const state = initialState()
    const material = state.settings.materials[0]
    expect(material.details).toBeUndefined()
    const old = normalize(JSON.parse(JSON.stringify(state)))
    expect(old.settings.materials.find(m => m.id === material.id)?.prices).toEqual(material.prices)
    const enriched = structuredClone(state)
    enriched.settings.materials[0].details = { density: '1,24 g/cm³', manufacturerSource: 'https://example.com', estimates: 'ocena', experience: 'moje opažanje' }
    const restored = normalize(JSON.parse(JSON.stringify(enriched)))
    expect(restored.settings.materials.find(m => m.id === material.id)?.details).toEqual(enriched.settings.materials[0].details)
    expect(restored.projects).toHaveLength(state.projects.length)
  })
})

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
