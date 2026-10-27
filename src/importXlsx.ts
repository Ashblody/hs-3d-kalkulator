import type { AppState } from './store'
import type { Customer, JobInput, Printer, Project, Settings } from './types'
import { blankJob } from './seed'

/** enkratna uvozna migracija (iz 6 starih Excel izračunov): izbriše stare projekte in doda opravljene */
export const IMPORT_ID = 'xlsx-opravljeni-2026-10-27'
/** projekti, ustvarjeni pred tem trenutkom, se ob migraciji izbrišejo; novejši ostanejo */
export const IMPORT_CUTOFF = '2026-10-27T06:51:00.000Z'

export const CORE_ONE: Printer = { id: 'core-one', name: 'Prusa CORE One', price: 1200, lifeHours: 3000, service: 200, powerW: { default: 200 }, note: 'Iz Excela: 1200 €, servis 200 €, 0,2 kWh/h (ocena).' }

interface Row {
  key: string; name: string; client: string; customer?: string; date: string; desc: string; printerId: string; materialId: string
  pieces: number; grams: number; h: number; m: number; cadMin: number; prepMin: number; excelPrice: number
}
/** cadMin = Model preparation; prepMin = slicing + material change + transfer + job removal + support removal + additional */
export const ROWS: Row[] = [
  { key: 'bruder-vilice', name: 'Vilice za bale (Bruder)', client: 'Bruder', date: '2026-06-21', desc: 'VILICE BALE 1X VELKE,1X MALE', printerId: 'indx', materialId: 'trcek-pla', pieces: 1, grams: 78, h: 2, m: 0, cadMin: 5, prepMin: 25, excelPrice: 23.91 },
  { key: 'matej-konci', name: 'Konci za alu profil (2×)', client: 'Matej', customer: 'Matej', date: '2026-06-21', desc: '2x konci alu profil', printerId: 'core-one', materialId: 'pm-asa', pieces: 2, grams: 26, h: 2, m: 30, cadMin: 20, prepMin: 12, excelPrice: 11.46 },
  { key: 'robert-nosilcek', name: 'Nosilček V2 (8 kom)', client: 'Robert', customer: 'Robert', date: '2026-06-21', desc: 'NOSILCEK V2 8 KOM (2X PO 1:40H)', printerId: 'core-one', materialId: 'pm-asa', pieces: 8, grams: 96, h: 3, m: 30, cadMin: 5, prepMin: 25, excelPrice: 26.72 },
  { key: 'ohisje-vlak', name: 'Ohišje temperatura vlak (2× test)', client: 'Ohišje temperatura vlak', date: '2025-11-01', desc: 'ohisje 2x test', printerId: 'core-one', materialId: 'pm-pla', pieces: 2, grams: 32, h: 2, m: 30, cadMin: 30, prepMin: 12, excelPrice: 14.2 },
  { key: 'ohisje', name: 'Ohišje', client: 'Ohišje', date: '2025-11-01', desc: 'ohisje', printerId: 'core-one', materialId: 'pm-pla', pieces: 1, grams: 160, h: 5, m: 30, cadMin: 2, prepMin: 9, excelPrice: 16.87 },
  { key: 'avto', name: 'Avto – vse skupaj', client: 'Avto', date: '2025-10-12', desc: 'avo vse skp', printerId: 'core-one', materialId: 'trcek-petg', pieces: 1, grams: 163, h: 15, m: 15, cadMin: 0, prepMin: 34, excelPrice: 28.52 },
]

const pid = (r: Row) => `imp-${r.key}`
const cid = (name: string) => `imp-cust-${name.toLowerCase()}`
const eur2 = (x: number) => x.toFixed(2).replace('.', ',')

function buildInput(r: Row, s: Settings, customerId?: string): JobInput {
  const j = blankJob(s.rates)
  return {
    ...j, name: r.name, client: r.client, customerId, date: r.date,
    description: `${r.desc} (uvoženo iz Excela; predlagana cena v Excelu ${eur2(r.excelPrice)} €, oddana cena ni bila vpisana)`,
    mode: 'osebno', orderType: 'tisk', printerId: r.printerId, materialId: r.materialId,
    pieces: r.pieces, gramsPerPiece: r.grams / r.pieces, useBatchTime: true, batchHours: r.h, batchMinutes: r.m,
    cadH: r.cadMin / 60, prepH: r.prepMin / 60,
  }
}

/** doda uvožene projekte (če manjkajo) in izbriše starejše; vrne isto stanje, če je migracija že narejena */
export function applyImport(st: AppState): AppState {
  if ((st.migrations ?? []).includes(IMPORT_ID)) return st
  const gone = new Set(st.deleted ?? [])
  const keep = new Set(ROWS.map(pid))
  const removed = st.projects.filter((p) => !keep.has(p.id) && (p.createdAt ?? '') < IMPORT_CUTOFF).map((p) => p.id)
  const gone2 = new Set([...gone, ...removed])
  let settings = st.settings
  if (!settings.printers.some((p) => p.id === CORE_ONE.id)) settings = { ...settings, printers: [...settings.printers, structuredClone(CORE_ONE)] }

  const customers = [...(st.customers ?? [])]
  const custIdFor = (name?: string) => {
    if (!name) return undefined
    const ex = customers.find((c) => c.name.trim().toLowerCase() === name.toLowerCase())
    if (ex) return ex.id
    const c: Customer = { id: cid(name), name, createdAt: IMPORT_CUTOFF }
    if (!gone.has(c.id)) customers.push(c)
    return c.id
  }
  const have = new Set(st.projects.map((p) => p.id))
  const added: Project[] = []
  for (const r of ROWS) {
    const id = pid(r)
    if (have.has(id) || gone.has(id)) continue
    const ts = `${r.date}T12:00:00.000Z`
    added.push({ id, status: 'opravljeno', createdAt: ts, updatedAt: ts, input: buildInput(r, settings, custIdFor(r.customer)), snapshot: structuredClone(settings), actual: { printHours: 0, grams: 0, laborHours: 0 } })
  }
  const projects = [...st.projects.filter((p) => !gone2.has(p.id)), ...added]
  const curGone = st.currentId && gone2.has(st.currentId)
  return {
    ...st, settings, customers, projects,
    deleted: [...gone2], migrations: [...(st.migrations ?? []), IMPORT_ID],
    ...(curGone ? { current: blankJob(settings.rates), currentId: null } : {}),
  }
}
