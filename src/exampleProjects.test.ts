import { describe, expect, it, vi } from 'vitest'
vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
import { initialState, normalize } from './store'
import { makeExampleProjects } from './exampleProjects'
import { calculate } from './calc'

describe('projekta 0002 in 0003', () => {
  it('ustvari primera z neznanim stanjem in brez ponovnega dodajanja', () => {
    const s = initialState(), result = makeExampleProjects(s.settings, [])
    expect(result.map(p => p.tracking?.code)).toEqual(['0002', '0003'])
    expect(result.every(p => p.status === 'neznano')).toBe(true)
    expect(result[0].input.pieces).toBe(4)
    expect(calculate(result[0].input, result[0].snapshot).printHours).toBe(20)
    expect(result[0].tracking?.notes).toContain('150 €')
    expect(makeExampleProjects(s.settings, result)).toHaveLength(0)
    const restored = normalize({ ...s, projects: result })
    expect(restored.projects.map(p => p.status)).toEqual(['neznano', 'neznano'])
    expect(restored.projects[1].input.description).toContain('začasni')
  })
})
