import type { JobInput, Settings } from './types'
import { allTiers, calculate, effSettings, floorFrom, isPrinting, isV10, r2 } from './calc'
import { emptyJob } from './seed'

export interface QuickInput { printH: number; grams: number; workH: number; matKg: number; printRate: number; workRate: number; markupPct: number; business: boolean; roundTo?: number
  /** false = brez tiska (samo delo); manjka = tisk vklopljen */
  printing?: boolean
  /** v10 pribitki iz Nastavitev (manjka = 0): rezerva za neuspele tiske %, marža %, odpad % gramov, DDV % (0 = ni DDV) */
  failPct?: number; marginPct?: number; wastePct?: number; vatPct?: number }
/** pribitki iz Nastavitev za Hitri */
export const quickExtras = (s: Settings): Pick<QuickInput, 'failPct' | 'marginPct' | 'wastePct' | 'vatPct'> =>
  ({ ...(isV10(s) ? { failPct: s.rates.reservePct ?? 0, marginPct: s.rates.marginPct ?? 0, wastePct: s.rates.wastePct ?? 0 } : {}), vatPct: s.business.vatEnabled ? s.business.vatPct : 0 })
export const quickDefaults: QuickInput = { printH: 0, grams: 0, workH: 0, matKg: 20, printRate: 3.5, workRate: 20, markupPct: 0, business: false }
const nz = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0)
const e2 = (x: number) => x.toLocaleString('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const n = (x: number) => x.toLocaleString('sl-SI', { maximumFractionDigits: 2 })

/** Andrejev preprost sistem; zaokroževanje navzgor po globalni nastavitvi (roundTo, 0 = brez) */
export const roundUp = (x: number, step = 0) => (step > 0 && x > 0 ? Math.ceil(Math.round(x * 100) / 100 / step) * step : r2(x))
export const quickPrinting = (q: QuickInput) => q.printing !== false
export function quickCalc(q: QuickInput) {
  const on = quickPrinting(q)
  const print = on ? nz(q.printH) * nz(q.printRate) : 0
  const wasteG = on ? nz(q.grams) * nz(q.wastePct ?? 0) / 100 : 0
  const material = on ? ((nz(q.grams) + wasteG) / 1000) * nz(q.matKg) : 0
  const work = nz(q.workH) * nz(q.workRate)
  const base = print + material + work
  const markup = base * Math.min(100, nz(q.markupPct)) / 100
  // vrstni red: osnova (+ dodatni pribitek) → + rezerva % → + marža % → (DDV) → zaokroževanje
  const fail = (base + markup) * nz(q.failPct ?? 0) / 100
  const margin = (base + markup + fail) * nz(q.marginPct ?? 0) / 100
  const vf = 1 + nz(q.vatPct ?? 0) / 100
  const net0 = base + markup + fail + margin
  const exact = r2(net0 * vf)
  const step = nz(q.roundTo ?? 0)
  const total = roundUp(exact, step)
  return { print: r2(print), material: r2(material), wasteG, work: r2(work), markup: r2(markup), fail: r2(fail), margin: r2(margin), vat: r2(net0 * (vf - 1)), exact, rounding: r2(total - exact), total, business: roundUp(exact * 2, step) }
}

export const quickText = (q: QuickInput) => {
  const r = quickCalc(q)
  return [...(quickPrinting(q) ? [`Tiskanje: ${n(q.printH)} h × ${e2(q.printRate)}/h = ${e2(r.print)}`, `Material: ${n(q.grams)} g × ${e2(q.matKg)}/kg = ${e2(r.material)}`] : []), `Delo: ${n(q.workH)} h × ${e2(q.workRate)}/h = ${e2(r.work)}`,
    ...(r.markup > 0 ? [`Pribitek ${n(q.markupPct)} %: ${e2(r.markup)}`] : []), ...(r.fail > 0 ? [`Rezerva za neuspele tiske ${n(q.failPct ?? 0)} %: ${e2(r.fail)}`] : []), ...(r.margin > 0 ? [`Marža ${n(q.marginPct ?? 0)} %: ${e2(r.margin)}`] : []), ...(r.vat > 0 ? [`DDV ${n(q.vatPct ?? 0)} %: ${e2(r.vat)}`] : []), ...(r.rounding > 0 ? [`Zaokroženo: +${e2(r.rounding)}`] : []), `Končna cena: ${e2(r.total)}`, ...(q.business ? [`Z računom: ${e2(r.business)}`] : [])].join('\n')
}

/** Kaj bi dal podrobni kalkulator (Na roke, privzeti tiskalnik + Bambu PLA Basic) */
export function quickCompare(q: QuickInput, s: Settings) {
  const j: JobInput = { ...emptyJob(s.rates), printing: quickPrinting(q), materialId: s.materials.some((m) => m.id === 'bb2-pla') ? 'bb2-pla' : emptyJob().materialId, pieces: 1, gramsPerPiece: nz(q.grams), useBatchTime: true, batchHours: Math.floor(nz(q.printH)), batchMinutes: Math.round((nz(q.printH) % 1) * 60) % 60, scanH: nz(q.workH), mode: 'osebno' }
  const d = allTiers(j, s).osebno.gross
  return { detailed: d, diff: r2(d - quickCalc({ ...q, ...quickExtras(s), roundTo: s.rates.roundTo }).total) }
}

/** kratek povzetek za stranko iz podrobnega kalkulatorja */
export function jobText(j: JobInput, s0: Settings) {
  const s = effSettings(j, s0)
  const r = calculate(j, s); const t = allTiers(j, s)
  const lines = [j.name ? `${j.name}` : '', ...(isPrinting(j) ? [`Tiskanje: ${n(r.printHours)} h × ${e2(r.printRate)}/h = ${e2(r.printHours * r.printRate)}`, `Material: ${n(r.kg * 1000)} g × ${e2(r.kg > 0 ? r.material / r.kg : 0)}/kg = ${e2(r.material)}`] : []),
    `Delo: ${n(r.laborHours)} h × ${e2(s.rates.labourHourly)}/h = ${e2(r.services)}`]
  if (r.digital > 0) lines.push(`Datoteke: ${e2(r.digital)}`)
  lines.push(`Končna cena: ${e2(r.gross)}`)
  if (j.mode !== 'poslovno') lines.push(`Poslovno (z računom): ${e2(t.poslovno.gross)}`)
  return lines.filter(Boolean).join('\n')
}
export const copyText = (t: string) => navigator.clipboard?.writeText(t).then(() => true, () => false) ?? Promise.resolve(false)

/** Hitri izračun → projekt (status Ponudba). Cenik projekta = vrednosti iz hitrega izračuna, brez zaokroževanja in min. naročila,
 *  material po vnesenih €/kg (ročni stroški tiska), pribitek kot "ostali stroški". Cena projekta = cena hitrega izračuna. */
export function quickToProject(q: QuickInput, name: string, s: Settings, customer?: { id: string; name: string }): { input: JobInput; snapshot: Settings } {
  const r = quickCalc(q)
  const on = quickPrinting(q)
  const h = on ? nz(q.printH) : 0
  const input: JobInput = {
    ...emptyJob(s.rates), ...(on ? {} : { printing: false }), name: name.trim() || 'Hitri izračun', client: customer?.name ?? '', customerId: customer?.id, description: `Hitri izračun: ${on ? `${n(h)} h tiska, ${n(q.grams)} g po ${e2(q.matKg)}/kg, ` : 'brez tiska, '}${n(q.workH)} h dela${q.markupPct ? `, pribitek ${n(q.markupPct)} %` : ''}`,
    mode: q.business ? 'poslovno' : 'osebno',
    materialId: s.materials.some((m) => m.id === 'bb2-pla') ? 'bb2-pla' : emptyJob().materialId,
    pieces: 1, gramsPerPiece: on ? nz(q.grams) : 0, useBatchTime: true, batchHours: Math.floor(h), batchMinutes: Math.round((h % 1) * 60) % 60,
    quickMarkupPct: nz(q.markupPct), quickMatKg: nz(q.matKg), reservePct: nz(q.failPct ?? 0), printCostOverride: on ? r.material : null, extraWorkH: nz(q.workH), extraWorkRate: nz(q.workRate), otherCosts: r.markup,
    // zaokroževanje naredi projekt sam (globalna nastavitev)
  }
  // Hitri izračun ima izrecno svojo postavko; v njegovem posnetku ne sme prevladati nastavitev tiskalnika.
  const printers = s.printers.map(({ printHourly: _printHourly, ...printer }) => printer)
  const snapshot: Settings = structuredClone({ ...s, printers, rates: { ...s.rates, printHourly: nz(q.printRate), labourHourly: nz(q.workRate), roundTo: nz(q.roundTo ?? 0), minOrder: 0, invoiceMultiplier: 2, marginPct: nz(q.marginPct ?? 0), wastePct: nz(q.wastePct ?? 0) },
    business: { ...s.business, vatEnabled: nz(q.vatPct ?? 0) > 0, vatPct: nz(q.vatPct ?? 0) || s.business.vatPct } })
  // ure, ki niso cele minute, ohranimo natančno prek ur na kos
  if (Math.abs(input.batchHours + input.batchMinutes / 60 - h) > 1e-9) Object.assign(input, { useBatchTime: false, hoursPerPiece: h, minutesPerPiece: 0 })
  return { input, snapshot }
}

/** spodnja meja za Hitri: moj strošek = material + elektrika/obraba/rezerva iz podrobnega izračuna (privzeti tiskalnik) */
export function quickFloor(q: QuickInput, s: Settings) {
  const mat = { id: '__q', name: 'Hitri', maker: '', type: 'PLA', spoolG: 1000, prices: [{ label: 'Hitri', price: nz(q.matKg) }], activePrice: 0, adhesive: 0 }
  const s2: Settings = { ...s, materials: [...s.materials, mat] }
  const j: JobInput = { ...emptyJob(s.rates), printing: quickPrinting(q), materialId: '__q', pieces: 1, gramsPerPiece: nz(q.grams), useBatchTime: true, batchHours: 0, batchMinutes: 0, consumables: 0, mode: 'osebno' }
  Object.assign(j, { useBatchTime: false, hoursPerPiece: nz(q.printH), minutesPerPiece: 0 })
  const own = calculate(j, s2).realCosts
  const r = quickCalc(q)
  return floorFrom(own, r.work, r.exact, quickPrinting(q) ? nz(q.printH) : 0, nz(q.printRate), nz(q.roundTo ?? 0), 2)
}
