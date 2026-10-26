import { useEffect, useState } from 'react'
import type { Customer, JobInput, Project, Settings, Status } from './types'
import { defaultSettings, demoJob, emptyJob, materials as seedV1, materialsV1Ids, materialsV2, blankJob, ratesV1, withAdhesive, rates as ratesNow } from './seed'
import { uid } from './format'

export interface AppState { version: 1; settings: Settings; projects: Project[]; customers: Customer[]; deleted?: string[]; current: JobInput; currentId: string | null; dark: boolean }
const KEY = 'hs3d-kalkulator-v1'

export function newProject(input: JobInput, settings: Settings): Project {
  const now = new Date().toISOString()
  return { id: uid(), status: 'ponudba', createdAt: now, updatedAt: now, input: structuredClone(input), snapshot: structuredClone(settings), actual: { printHours: 0, grams: 0, laborHours: 0 } }
}

export function initialState(): AppState {
  const settings = defaultSettings()
  const demo = newProject(demoJob(), settings)
  return { version: 1, settings, projects: [demo], customers: [], current: structuredClone(demo.input), currentId: demo.id, dark: window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false }
}

const statusMap: Record<string, Status> = { ponudba: 'ponudba', osnutek: 'ponudba', sprejeto: 'sprejeto', potrjeno: 'sprejeto', izdelava: 'sprejeto', natisnjeno: 'natisnjeno', zakljuceno: 'natisnjeno', placano: 'placano' }
export const migrateStatus = (s: string | undefined): Status => statusMap[s ?? ''] ?? 'ponudba'

/** Podvoji projekt kot nov (ime + ' (kopija)', status Ponudba, trenutni cenik) */
export const duplicateProject = (p: Project, settings: Settings): Project =>
  newProject({ ...structuredClone(p.input), name: `${p.input.name} (kopija)`, date: new Date().toISOString().slice(0, 10) }, settings)

/** poslovne nastavitve: 0 je veljavna vrednost; neveljavno (NaN, null, negativno, besedilo) → privzeto */
export function fixBusiness(base: Settings['business'], stored: Partial<Settings['business']> | undefined): Settings['business'] {
  const out = { ...base, ...(stored ?? {}) } as Settings['business']
  for (const k of Object.keys(base) as (keyof Settings['business'])[]) {
    if (typeof base[k] === 'number') { const v = Number(out[k]); (out as any)[k] = out[k] !== null && out[k] !== '' as any && Number.isFinite(v) && v >= 0 ? v : base[k] }
  }
  return out
}

/** v7: 4 stopnje + Na roke/Z računom → Osebno / Poslovno (Stranka z računom → Poslovno) */
export function migrateMode(j: Partial<JobInput> | undefined): JobInput['mode'] {
  const m = (j?.mode ?? 'stranka') as string, inv = (j as { invoice?: boolean } | undefined)?.invoice
  if (m === 'osebno' || m === 'poslovno') return m
  return m === 'stranka' && inv !== false ? 'poslovno' : 'osebno'
}
const OLD_RATES = ['friendPrintHourly', 'familyLabourPct']
const dropOldRates = <T,>(r: T): T => { for (const k of OLD_RATES) delete (r as Record<string, unknown>)[k]; return r }
/** v7: digitalne postavke in pravice izklopljene, ostane samo Brez / STL / STEP */
const stripOld = (j: JobInput): JobInput => {
  delete (j as { invoice?: boolean }).invoice
  for (const k of Object.keys(j.digital) as (keyof JobInput['digital'])[]) j.digital[k] = { ...j.digital[k], on: false }
  return j
}

/** v9: združene vrstice dela, dodatna poraba v teži, pakiranje/dostava v ostalo, neposredni v potrošni */
export const mergeLegacy = (j: JobInput): JobInput => {
  const o = { ...j }
  o.cadH = (+o.cadH || 0) + (+o.reverseH || 0); o.reverseH = 0
  o.prepH = (+o.prepH || 0) + (+o.finishH || 0); o.finishH = 0
  o.otherCosts = (+o.otherCosts || 0) + (+o.packaging || 0) + (+o.delivery || 0); o.packaging = 0; o.delivery = 0
  o.consumables = (+o.consumables || 0) + (+o.otherDirect || 0); o.otherDirect = 0
  const x = +o.extraMaterialG || 0
  if (x > 0) {
    if (o.usePlates) { const i = o.plates.findIndex((p) => p.materialId === o.materialId); if (i >= 0) { o.plates = o.plates.map((p, k) => (k === i ? { ...p, grams: p.grams + x } : p)); o.extraMaterialG = 0 } }
    else if (o.pieces > 0) { o.gramsPerPiece = o.gramsPerPiece + x / o.pieces; o.extraMaterialG = 0 }
  }
  return o
}

/** dopolni manjkajoča polja (npr. po uvozu starejše kopije) */
export function normalize(raw: unknown): AppState {
  const base = initialState()
  const r = raw as Partial<AppState>
  if (!r || typeof r !== 'object' || !r.settings) throw new Error('Neveljavna datoteka')
  const fixJob = (j: Partial<JobInput>): JobInput => mergeLegacy(stripOld({ ...emptyJob(), ...j, digital: { ...emptyJob().digital, ...(j?.digital ?? {}) }, fileSale: { kind: j?.fileSale?.kind ?? 'none' }, mode: migrateMode(j), plates: Array.isArray(j?.plates) ? j.plates : [], usePlates: !!j?.usePlates, rights: { ...emptyJob().rights, ...(j?.rights ?? {}) } } as JobInput))
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
  // v5: moja ura 36 → 20 (samo če je še stara privzeta)
  if ((r.settings.ratesVersion ?? 1) < 5 && r.settings.rates?.labourHourly === 36) storedRates.labourHourly = 20
  // v6: zaokroževanje 5 → 1 € (samo če je še stara privzeta)
  if ((r.settings.ratesVersion ?? 1) < 6 && r.settings.rates?.roundTo === 5) storedRates.roundTo = 1
  // v8: zaokroževanje je globalno – stari posnetki projektov s 5 € dobijo trenutno nastavitev
  const migrateRound = (r.settings.ratesVersion ?? 1) < 8
  // v6: datoteke samo kot doplačilo k tisku – odstrani stare nastavitve
  for (const k of ['fileHandoverFee', 'repeatSalePct', ...OLD_RATES]) delete (storedRates as unknown as Record<string, unknown>)[k]
  return {
    version: 1,
    settings: { ...base.settings, ...r.settings, materials: withAdhesive(materials, storedRates.adhesiveDefault), materialSeeds: allSeeds.map((m) => m.id), ratesVersion: 9, rates: storedRates, business: fixBusiness(base.settings.business, r.settings.business) },
    projects: (r.projects ?? []).map((p) => ({ ...p, snapshot: p.snapshot ? { ...p.snapshot, materials: (p.snapshot.materials ?? []).map((m) => (m.adhesive === undefined ? { ...m, adhesive: 0 } : m)), rates: dropOldRates({ ...base.settings.rates, ...p.snapshot.rates, ...(migrateRound && p.snapshot.rates?.roundTo === 5 ? { roundTo: storedRates.roundTo } : {}) }) } : p.snapshot, status: migrateStatus(p.status as string), input: fixJob(p.input), actual: Object.assign({ printHours: 0, grams: 0, laborHours: 0 }, p.actual) })),
    deleted: Array.isArray(r.deleted) ? r.deleted.filter((x) => typeof x === 'string') : [],
    customers: Array.isArray(r.customers) ? r.customers.filter((c) => c && c.id && c.name) : [],
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
