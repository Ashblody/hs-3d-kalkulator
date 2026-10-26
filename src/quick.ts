import type { JobInput, Settings } from './types'
import { allTiers, calculate, r2 } from './calc'
import { emptyJob } from './seed'

export interface QuickInput { printH: number; grams: number; workH: number; matKg: number; printRate: number; workRate: number; markupPct: number; business: boolean }
export const quickDefaults: QuickInput = { printH: 0, grams: 0, workH: 0, matKg: 20, printRate: 3.5, workRate: 20, markupPct: 0, business: false }
const nz = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0)
const e2 = (x: number) => x.toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const n = (x: number) => x.toLocaleString('sl-SI', { maximumFractionDigits: 2 })

/** Andrejev preprost sistem: brez zaokroževanja */
export function quickCalc(q: QuickInput) {
  const print = nz(q.printH) * nz(q.printRate)
  const material = (nz(q.grams) / 1000) * nz(q.matKg)
  const work = nz(q.workH) * nz(q.workRate)
  const base = print + material + work
  const markup = base * Math.min(100, nz(q.markupPct)) / 100
  const total = r2(base + markup)
  return { print: r2(print), material: r2(material), work: r2(work), markup: r2(markup), total, business: r2(total * 2) }
}

export const quickText = (q: QuickInput) => {
  const r = quickCalc(q)
  return [`Tiskanje: ${n(q.printH)} h × ${e2(q.printRate)}/h = ${e2(r.print)}`, `Material: ${n(q.grams)} g = ${e2(r.material)}`, `Delo: ${n(q.workH)} h × ${e2(q.workRate)}/h = ${e2(r.work)}`,
    ...(r.markup > 0 ? [`Pribitek ${n(q.markupPct)} %: ${e2(r.markup)}`] : []), `Končna cena: ${e2(r.total)}`, ...(q.business ? [`Z računom: ${e2(r.business)}`] : [])].join('\n')
}

/** Kaj bi dal podrobni kalkulator (Na roke, privzeti tiskalnik + Bambu PLA Basic) */
export function quickCompare(q: QuickInput, s: Settings) {
  const j: JobInput = { ...emptyJob(s.rates), materialId: s.materials.some((m) => m.id === 'bb2-pla') ? 'bb2-pla' : emptyJob().materialId, pieces: 1, gramsPerPiece: nz(q.grams), useBatchTime: true, batchHours: Math.floor(nz(q.printH)), batchMinutes: Math.round((nz(q.printH) % 1) * 60) % 60, scanH: nz(q.workH), mode: 'prijatelj', invoice: false }
  const d = allTiers(j, s).naroke.net
  return { detailed: d, diff: r2(d - quickCalc(q).total) }
}

/** kratek povzetek za stranko iz podrobnega kalkulatorja */
export function jobText(j: JobInput, s: Settings) {
  const r = calculate(j, s); const t = allTiers(j, s)
  const lines = [j.name ? `${j.name}` : '', `Tiskanje: ${n(r.printHours)} h × ${e2(s.rates.printHourly)}/h = ${e2(r.printHours * s.rates.printHourly)}`, `Material: ${n(r.kg * 1000)} g = ${e2(r.material)}`,
    `Delo: ${n(r.laborHours)} h × ${e2(s.rates.labourHourly)}/h = ${e2(r.services)}`]
  if (r.digital > 0) lines.push(`Datoteke: ${e2(r.digital)}`)
  lines.push(`Končna cena: ${e2(r.gross)}`)
  if (j.mode !== 'stranka' || !j.invoice) lines.push(`Z računom: ${e2(t.racun.gross)}`)
  return lines.filter(Boolean).join('\n')
}
export const copyText = (t: string) => navigator.clipboard?.writeText(t).then(() => true, () => false) ?? Promise.resolve(false)
