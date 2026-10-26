import type { JobInput, Material, Printer, Settings } from './types'

export const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100
const nz = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0)

export const pricePerKg = (m: Material) => {
  const p = m.prices[m.activePrice] ?? m.prices[0]
  return m.spoolG > 0 && p ? p.price / (m.spoolG / 1000) : 0
}
export const wearPerHour = (p: Printer) => (p.lifeHours > 0 ? (p.price + p.service) / p.lifeHours : 0)
export const powerFor = (p: Printer, materialType: string) => p.powerW[materialType] ?? p.powerW.default ?? 0

/** Pribitek -> bruto marža: 50 % pribitka = 33,33 % marže */
export const markupToMargin = (markupPct: number) => (markupPct <= -100 ? 0 : (markupPct / (100 + markupPct)) * 100)

/** Datoteka zraven tiska: fiksno doplačilo iz nastavitev (pred popustom stopnje). */
export function fileSaleInfo(j: JobInput, s: Settings) {
  const k = j.fileSale?.kind ?? 'none'
  const price = k === 'stl' ? nz(s.rates.fileAddonStl) : k === 'step' ? nz(s.rates.fileAddonStep) : 0
  return { price }
}

export function totalPrintHours(j: JobInput) {
  // skupen čas serije se NE množi s številom kosov
  if (j.usePlates) return (j.plates ?? []).reduce((a, p) => a + nz(p.hours) + nz(p.minutes) / 60, 0)
  if (j.useBatchTime) return nz(j.batchHours) + nz(j.batchMinutes) / 60
  return nz(j.pieces) * (nz(j.hoursPerPiece) + nz(j.minutesPerPiece) / 60)
}

export interface Result {
  printHours: number; kg: number; powerW: number
  material: number; electricity: number; wear: number; consumables: number; otherDirect: number
  printBeforeReserve: number; reserve: number; printCost: number; printOverridden: boolean
  markup: number; printSale: number; printMarginPct: number
  servicesStandard: number; servicesDiscount: number; services: number
  digital: number; laborHours: number
  baseTotal: number; invoiceMult: number; invoiceExtra: number
  transport: number; packaging: number; delivery: number; otherCosts: number; discount: number
  subtotal: number; minOrderApplied: boolean
  netBeforeRounding: number; rounding: number
  net: number; vat: number; gross: number; perPiece: number
  /** zase: informativna vrednost časa */
  timeValue: number
  fixedShare: number; tax: number; realCosts: number; profit: number; earnings: number; earningsPerHour: number
  belowTarget: boolean
}

export function calculate(j: JobInput, s: Settings): Result {
  const printer = s.printers.find((p) => p.id === j.printerId)
  const mat = s.materials.find((m) => m.id === j.materialId)
  const printHours = totalPrintHours(j)
  const plates = j.usePlates ? (j.plates ?? []) : []
  const kg = ((j.usePlates ? plates.reduce((a, p) => a + nz(p.grams), 0) : nz(j.pieces) * nz(j.gramsPerPiece)) + nz(j.extraMaterialG)) / 1000
  const powerW = printer && mat ? powerFor(printer, mat.type) : 0

  const priceOf = (id: string) => { const m = s.materials.find((x) => x.id === id) ?? mat; return m ? pricePerKg(m) : 0 }
  const material = j.usePlates
    ? plates.reduce((a, p) => a + (nz(p.grams) / 1000) * priceOf(p.materialId), 0) + (nz(j.extraMaterialG) / 1000) * (mat ? pricePerKg(mat) : 0)
    : mat ? kg * pricePerKg(mat) : 0
  const electricity = printHours * (powerW / 1000) * s.business.kwhPrice
  const wear = printer ? printHours * wearPerHour(printer) : 0
  const consumables = nz(j.consumables)
  const otherDirect = nz(j.otherDirect)
  const printBeforeReserve = material + electricity + wear + consumables + otherDirect
  const reserve = printBeforeReserve * (nz(j.reservePct) / 100)
  const printOverridden = j.printCostOverride !== null && Number.isFinite(j.printCostOverride) && j.printCostOverride >= 0
  const printCost = printOverridden ? (j.printCostOverride as number) : printBeforeReserve + reserve

  const r = s.rates
  // tisk = fiksno € na uro tiskalnika + material/potrošni po strošku
  const printDirect = printOverridden ? (j.printCostOverride as number) : material + consumables + otherDirect
  const printSale = printHours * nz(r.printHourly) + printDirect
  const markup = printSale - printCost

  const fs = fileSaleInfo(j, s)
  const L = nz(r.labourHourly)
  const servicesStandard =
    (nz(j.scanH) + nz(j.editH) + nz(j.cadH) + nz(j.reverseH) + nz(j.prepH) + nz(j.finishH)) * L + nz(j.extraWorkH) * nz(j.extraWorkRate)
  // datoteka: samo fiksna izbira Brez / STL / STEP
  const digital = fs.price
  const laborHours = nz(j.scanH) + nz(j.editH) + nz(j.cadH) + nz(j.reverseH) + nz(j.prepH) + nz(j.finishH) + nz(j.extraWorkH)
  const timeValue = servicesStandard + digital
  const servicesDiscount = 0
  const services = servicesStandard
  const invoiceMult = j.mode === 'poslovno' ? (Number.isFinite(r.invoiceMultiplier) && r.invoiceMultiplier > 0 ? r.invoiceMultiplier : 1) : 1

  const transport = nz(j.km) * r.km
  const packaging = nz(j.packaging), delivery = nz(j.delivery), otherCosts = nz(j.otherCosts)
  const discount = nz(j.discount)
  const baseTotal = printSale + services + digital + transport + packaging + delivery + otherCosts
  const invoiceExtra = baseTotal * (invoiceMult - 1)
  const subtotal = baseTotal + invoiceExtra - discount
  const minOrderApplied = subtotal > 0 && subtotal < r.minOrder
  const netBeforeRounding = Math.max(0, minOrderApplied ? r.minOrder : subtotal)
  const step = nz(r.roundTo)
  const net = step > 0 && netBeforeRounding > 0 ? Math.ceil(Math.round(netBeforeRounding * 100) / 100 / step) * step : netBeforeRounding
  const rounding = net - netBeforeRounding
  const vat = s.business.vatEnabled ? net * (s.business.vatPct / 100) : 0
  const gross = net + vat
  const perPiece = nz(j.pieces) > 0 ? gross / j.pieces : gross

  // Moj strošek: material, elektrika, obraba, potrošni, rezerva + prevoz/pakiranje/dostava
  const passThrough = transport + packaging + delivery + otherCosts
  const realCosts = printCost + passThrough
  const profit = net - realCosts
  const fixedShare = s.business.billableHours > 0 ? (s.business.monthlyFixed / s.business.billableHours) * laborHours : 0
  const tax = net * (nz(s.business.taxPct) / 100)
  const earnings = net - realCosts - fixedShare - tax
  const earningsPerHour = laborHours > 0 ? earnings / laborHours : 0
  const belowTarget = laborHours > 0 && earningsPerHour < s.business.targetHourly

  return {
    printHours, kg, powerW, material, electricity, wear, consumables, otherDirect,
    printBeforeReserve, reserve, printCost, printOverridden, markup, printSale,
    printMarginPct: printSale > 0 ? (markup / printSale) * 100 : 0,
    servicesStandard, servicesDiscount, services, digital, profit, laborHours, baseTotal, invoiceMult, invoiceExtra,
    transport, packaging, delivery, otherCosts, discount, subtotal, minOrderApplied,
    netBeforeRounding, rounding, net, vat, gross, perPiece, timeValue, fixedShare, tax, realCosts, earnings, earningsPerHour, belowTarget,
  }
}

/** Mesečni plan: ali cenik pri načrtovanih urah doseže ciljno postavko */
export function monthlyPlan(s: Settings, avgLaborRate: number) {
  const b = s.business
  const revenue = b.billableHours * avgLaborRate
  const tax = revenue * (b.taxPct / 100)
  const result = revenue - b.monthlyFixed - tax
  const hourly = b.billableHours > 0 ? result / b.billableHours : 0
  return { revenue, fixed: b.monthlyFixed, tax, result, hourly, ok: hourly >= b.targetHourly }
}

export function validateJob(j: JobInput): string[] {
  const e: string[] = []
  const nums: [keyof JobInput, string][] = [
    ['pieces', 'Število kosov'], ['gramsPerPiece', 'Teža kosa'], ['hoursPerPiece', 'Ure tiska'],
    ['minutesPerPiece', 'Minute tiska'], ['extraMaterialG', 'Dodatna poraba'], ['consumables', 'Potrošni material'],
    ['reservePct', 'Rezerva'], ['markupPct', 'Pribitek'], ['km', 'Kilometri'], ['discount', 'Popust'],
  ]
  for (const [k, l] of nums) { const v = j[k] as number; if (!Number.isFinite(v) || v < 0) e.push(`${l} mora biti 0 ali več.`) }
  if (j.minutesPerPiece >= 60 || j.batchMinutes >= 60) e.push('Minute morajo biti manj kot 60.')
  if (!Number.isInteger(j.pieces) || j.pieces < 1) e.push('Število kosov mora biti celo število, vsaj 1.')
  return e
}

/** Obe ceni hkrati za isti posel */
export const TIERS = [
  ['osebno', 'Osebno', 'na roke'],
  ['poslovno', 'Poslovno', 'z računom'],
] as const
export function allTiers(j: JobInput, s: Settings) {
  return { osebno: calculate({ ...j, mode: 'osebno' }, s), poslovno: calculate({ ...j, mode: 'poslovno' }, s) }
}
