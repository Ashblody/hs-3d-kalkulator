import { useEffect, useState } from 'react'
import type { JobInput, Project, Settings, Status } from './types'
import { defaultSettings, demoJob, emptyJob, materials as seedV1, materialsV1Ids, materialsV2, blankJob, ratesV1, rates as ratesNow } from './seed'
import { uid } from './format'

export interface AppState { version: 1; settings: Settings; projects: Project[]; current: JobInput; currentId: string | null; dark: boolean }
const KEY = 'hs3d-kalkulator-v1'

export function newProject(input: JobInput, settings: Settings): Project {
  const now = new Date().toISOString()
  return { id: uid(), status: 'ponudba', createdAt: now, updatedAt: now, input: structuredClone(input), snapshot: structuredClone(settings), actual: { printHours: 0, grams: 0, laborHours: 0 } }
}

export function initialState(): AppState {
  const settings = defaultSettings()
  const demo = newProject(demoJob(), settings)
  return { version: 1, settings, projects: [demo], current: structuredClone(demo.input), currentId: demo.id, dark: window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false }
}

const statusMap: Record<string, Status> = { ponudba: 'ponudba', osnutek: 'ponudba', sprejeto: 'sprejeto', potrjeno: 'sprejeto', izdelava: 'sprejeto', natisnjeno: 'natisnjeno', zakljuceno: 'natisnjeno', placano: 'placano' }
export const migrateStatus = (s: string | undefined): Status => statusMap[s ?? ''] ?? 'ponudba'

/** Podvoji projekt kot nov (ime + ' (kopija)', status Ponudba, trenutni cenik) */
export const duplicateProject = (p: Project, settings: Settings): Project =>
  newProject({ ...structuredClone(p.input), name: `${p.input.name} (kopija)`, date: new Date().toISOString().slice(0, 10) }, settings)

/** dopolni manjkajoča polja (npr. po uvozu starejše kopije) */
export function normalize(raw: unknown): AppState {
  const base = initialState()
  const r = raw as Partial<AppState>
  if (!r || typeof r !== 'object' || !r.settings) throw new Error('Neveljavna datoteka')
  const fixJob = (j: Partial<JobInput>) => ({ ...emptyJob(), ...j, digital: { ...emptyJob().digital, ...(j?.digital ?? {}) }, fileSale: { kind: j?.fileSale?.kind ?? 'none' }, plates: Array.isArray(j?.plates) ? j.plates : [], usePlates: !!j?.usePlates, rights: { ...emptyJob().rights, ...(j?.rights ?? {}) } })
  // migracija: dodaj nove privzete materiale, ne prepiši urejenih in ne vrni izbrisanih
  const seen = new Set(r.settings.materialSeeds ?? materialsV1Ids)
  const have = new Set((r.settings.materials ?? []).map((m) => m.id))
  const allSeeds = [...seedV1, ...materialsV2]
  const appended = allSeeds.filter((m) => !seen.has(m.id) && !have.has(m.id)).map((m) => structuredClone(m))
  const materials = [...(r.settings.materials ?? base.settings.materials), ...appended]
  // migracija cenika v3: zamenjaj samo vrednosti, ki so še enake starim privzetim
  const storedRates = { ...base.settings.rates, ...r.settings.rates }
  if ((r.settings.ratesVersion ?? 1) < 3) {
    for (const k of Object.keys(ratesV1) as (keyof typeof ratesV1)[]) if (r.settings.rates?.[k] === ratesV1[k]) storedRates[k] = ratesNow[k]
  }
  // v6: datoteke samo kot doplačilo k tisku – odstrani stare nastavitve
  for (const k of ['fileHandoverFee', 'repeatSalePct']) delete (storedRates as unknown as Record<string, unknown>)[k]
  return {
    version: 1,
    settings: { ...base.settings, ...r.settings, materials, materialSeeds: allSeeds.map((m) => m.id), ratesVersion: 3, rates: storedRates, business: { ...base.settings.business, ...r.settings.business } },
    projects: (r.projects ?? []).map((p) => ({ ...p, status: migrateStatus(p.status as string), input: fixJob(p.input), actual: Object.assign({ printHours: 0, grams: 0, laborHours: 0 }, p.actual) })),
    current: fixJob(r.current ?? emptyJob()),
    currentId: r.currentId ?? null,
    dark: !!r.dark,
  }
}

export function usePersistentState() {
  const [state, setState] = useState<AppState>(() => {
    try { const s = localStorage.getItem(KEY); if (s) return normalize(JSON.parse(s)) } catch { /* prvi zagon */ }
    return initialState()
  })
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)) }, [state])
  useEffect(() => { document.documentElement.classList.toggle('dark', state.dark) }, [state.dark])
  return [state, setState] as const
}

/** Ali ima trenutni izračun neshranjene spremembe (glede na shranjen projekt ali prazen projekt) */
export function hasUnsaved(st: AppState): boolean {
  const strip = (j: JobInput) => JSON.stringify({ ...j, date: '' })
  const p = st.projects.find((x) => x.id === st.currentId)
  if (p) return strip(p.input) !== strip(st.current)
  return strip(st.current) !== strip(blankJob(st.settings.rates)) && strip(st.current) !== strip(emptyJob(st.settings.rates))
}

/** Nov prazen projekt – nastavitve, materiali in tiskalniki ostanejo */
export const startBlank = (st: AppState): AppState => ({ ...st, current: blankJob(st.settings.rates), currentId: null })
