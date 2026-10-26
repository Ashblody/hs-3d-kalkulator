import type { Customer, JobInput, Project, Settings } from './types'
import { calculate, effSettings, pricePerKg } from './calc'
import type { QuickInput } from './quick'
import { uid } from './format'

export const newCustomer = (name: string, extra: Partial<Customer> = {}): Customer => ({ id: uid(), name: name.trim(), createdAt: new Date().toISOString(), ...extra })

export const customerProjects = (projects: Project[], id: string) =>
  projects.filter((p) => p.input.customerId === id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

/** Kako sem nazadnje računal tej stranki (iz zadnjega projekta) */
export function lastPricing(projects: Project[], id: string) {
  const p = customerProjects(projects, id)[0]
  if (!p) return null
  const s = effSettings(p.input, p.snapshot)
  const mat = s.materials.find((m) => m.id === p.input.materialId)
  return {
    mode: p.input.mode, materialId: p.input.materialId, reservePct: p.input.reservePct, markupPct: p.input.markupPct, fileSale: { ...p.input.fileSale },
    rates: { printHourly: s.rates.printHourly, labourHourly: s.rates.labourHourly, roundTo: s.rates.roundTo, fileAddonStl: s.rates.fileAddonStl, fileAddonStep: s.rates.fileAddonStep },
    matKg: p.input.quickMatKg ?? (mat ? pricePerKg(mat) : undefined), quickMarkupPct: p.input.quickMarkupPct, from: p,
  }
}

/** Izbira stranke v Podrobnem: ime + nazadnje uporabljen cenik */
export function applyCustomer(job: JobInput, c: Customer | undefined, projects: Project[], settings: Settings): JobInput {
  if (!c) return { ...job, customerId: undefined, rateOverride: undefined }
  const lp = lastPricing(projects, c.id)
  const out: JobInput = { ...job, customerId: c.id, client: c.name }
  if (!lp) return out
  return {
    ...out, mode: lp.mode, reservePct: lp.reservePct, markupPct: lp.markupPct, fileSale: lp.fileSale,
    materialId: settings.materials.some((m) => m.id === lp.materialId) ? lp.materialId : job.materialId,
    rateOverride: lp.rates,
  }
}

/** Izbira stranke v Hitrem */
export function applyCustomerQuick(q: QuickInput, c: Customer | undefined, projects: Project[]): QuickInput {
  const lp = c && lastPricing(projects, c.id)
  if (!lp) return q
  return { ...q, business: lp.mode === 'poslovno', printRate: lp.rates.printHourly, workRate: lp.rates.labourHourly, markupPct: lp.quickMarkupPct ?? lp.markupPct ?? 0, ...(lp.matKg ? { matKg: Math.round(lp.matKg * 100) / 100 } : {}) }
}

export function customerTotals(projects: Project[], id: string) {
  const ps = customerProjects(projects, id)
  let total = 0, paid = 0, earnings = 0
  for (const p of ps) { const r = calculate(p.input, p.snapshot); total += r.gross; earnings += r.earnings; if (p.status === 'placano') paid += r.gross }
  return { count: ps.length, total, paid, open: total - paid, earnings }
}
