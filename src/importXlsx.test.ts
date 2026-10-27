// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { calculate } from './calc'
import { mergeStates } from './backup'
import { IMPORT_CUTOFF, IMPORT_ID, ROWS } from './importXlsx'
import { freshState, initialState, newProject, normalize } from './store'
import { blankJob } from './seed'

const oldState = () => {
  const st = initialState(); const p = newProject(blankJob(), st.settings); p.createdAt = '2026-10-20T10:00:00.000Z'; p.updatedAt = p.createdAt
  const c = { id: 'c-old', name: 'Stari kupec', createdAt: '2026-10-01T00:00:00.000Z' }
  return { ...st, migrations: [], projects: [st.projects[0], p], customers: [c] }
}
const stripCreated = (s: ReturnType<typeof oldState>) => ({ ...s, projects: s.projects.map((p) => ({ ...p, createdAt: '2026-10-25T00:00:00.000Z' })) })

describe('uvoz opravljenih projektov iz Excela', () => {
  const migrated = normalize(stripCreated(oldState()))
  it('izbriše stare projekte in doda 6 opravljenih', () => {
    expect(migrated.projects.map((p) => p.id).sort()).toEqual(ROWS.map((r) => `imp-${r.key}`).sort())
    expect(migrated.projects.every((p) => p.status === 'opravljeno')).toBe(true)
    expect(migrated.deleted?.length).toBe(2)
    expect(migrated.migrations).toContain(IMPORT_ID)
    expect(migrated.currentId).toBeNull()
  })
  it('stranke ostanejo, Robert in Matej se ustvarita', () => {
    const names = migrated.customers.map((c) => c.name)
    expect(names).toEqual(expect.arrayContaining(['Stari kupec', 'Robert', 'Matej']))
    const rob = migrated.projects.find((p) => p.id === 'imp-robert-nosilcek')!
    expect(rob.input.customerId).toBe(migrated.customers.find((c) => c.name === 'Robert')!.id)
  })
  it('podatki: grami, čas, delo, material, tiskalnik obstaja', () => {
    for (const r of ROWS) {
      const p = migrated.projects.find((x) => x.id === `imp-${r.key}`)!
      const res = calculate(p.input, p.snapshot)
      expect(res.kg * 1000).toBeCloseTo(r.grams, 5)
      expect(res.printHours).toBeCloseTo(r.h + r.m / 60, 5)
      expect(res.laborHours).toBeCloseTo((r.cadMin + r.prepMin) / 60, 5)
      expect(p.snapshot.printers.some((x) => x.id === p.input.printerId)).toBe(true)
      expect(p.snapshot.materials.some((x) => x.id === p.input.materialId)).toBe(true)
      expect(res.net).toBeGreaterThan(0)
    }
  })
  it('ni dvojnikov med 6 projekti', () => {
    expect(new Set(ROWS.map((r) => `${r.name}|${r.grams}|${r.h}|${r.m}`)).size).toBe(6)
  })
  it('migracija je enkratna: nov projekt kasneje ostane, ponovni zagon ne briše', () => {
    const np = newProject(blankJob(), migrated.settings)
    const again = normalize({ ...migrated, projects: [...migrated.projects, np] })
    expect(again.projects.length).toBe(7)
    expect(again.deleted?.length).toBe(2)
  })
  it('brez zastavice: projekti, ustvarjeni po IMPORT_CUTOFF, ostanejo', () => {
    const o = oldState(); o.projects[1].createdAt = new Date(Date.parse(IMPORT_CUTOFF) + 60000).toISOString()
    const r = normalize({ ...o, projects: [o.projects[1]] })
    expect(r.projects.some((p) => p.id === o.projects[1].id)).toBe(true)
  })
  it('druga naprava: združevanje ne vrne starih in ne podvoji', () => {
    const a = migrated
    const bOld = oldState(); const b = normalize(stripCreated(bOld))
    const m = mergeStates(a, b).state
    expect(m.projects.length).toBe(6)
    // stara naprava (brez migracije) potisne stare projekte nazaj → tombstone jih zavrne
    const stale = { ...oldState(), projects: oldState().projects }
    stale.projects = [...a.projects.slice(0, 0), ...stripCreated(oldState()).projects]
    const m2 = mergeStates(a, { ...stale, projects: stripCreated(oldState()).projects.map((p, i) => ({ ...p, id: (a.deleted ?? [])[i] ?? p.id })) } as never).state
    expect(m2.projects.length).toBe(6)
  })
  it('čista namestitev: brez demo, 6 opravljenih', () => {
    const f = freshState()
    expect(f.projects.length).toBe(6); expect(f.projects.some((p) => p.input.client === 'Demo')).toBe(false)
  })
})
