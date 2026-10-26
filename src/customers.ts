import type { Customer, CustomerPricing, JobInput, Project, Settings } from './types'
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
    rates: { printHourly: s.rates.printHourly, labourHourly: s.rates.labourHourly, fileAddonStl: s.rates.fileAddonStl, fileAddonStep: s.rates.fileAddonStep },
    matKg: p.input.quickMatKg ?? (mat ? pricePerKg(mat) : undefined), quickMarkupPct: p.input.quickMarkupPct, from: p,
  }
}

const fin = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0
/** Cenik stranke: zadnji projekt + ročni popravki iz "Uredi stranko" (imajo prednost) */
export function customerPricing(projects: Project[], c: Customer, settings: Settings) {
  const lp = lastPricing(projects, c.id); const p: CustomerPricing = c.pricing ?? {}
  if (!lp && !Object.keys(p).length) return null
  const rates = { ...(lp?.rates ?? {}) } as Record<string, number>
  if (fin(p.printHourly)) rates.printHourly = p.printHourly
  if (fin(p.labourHourly)) rates.labourHourly = p.labourHourly
  return {
    mode: p.mode ?? lp?.mode, fileSale: p.fileSale ? { kind: p.fileSale } : lp?.fileSale, rates: rates as Partial<Settings['rates']>,
    matKg: fin(p.matKg) ? p.matKg : lp?.matKg, markupPct: fin(p.markupPct) ? p.markupPct : (lp?.quickMarkupPct ?? lp?.markupPct),
    reservePct: lp?.reservePct, materialId: lp?.materialId, lp, settings,
  }
}

/** Izbira stranke v Podrobnem: ime + nazadnje uporabljen cenik */
export function applyCustomer(job: JobInput, c: Customer | undefined, projects: Project[], settings: Settings): JobInput {
  if (!c) return { ...job, customerId: undefined, rateOverride: undefined }
  const cp = customerPricing(projects, c, settings)
  const out: JobInput = { ...job, customerId: c.id, client: c.name }
  if (!cp) return out
  return {
    ...out, mode: cp.mode ?? job.mode, reservePct: cp.reservePct ?? job.reservePct, markupPct: cp.lp?.markupPct ?? job.markupPct, fileSale: cp.fileSale ?? job.fileSale,
    materialId: cp.materialId && settings.materials.some((m) => m.id === cp.materialId) ? cp.materialId : job.materialId,
    rateOverride: Object.keys(cp.rates).length ? cp.rates : undefined,
  }
}

/** Izbira stranke v Hitrem */
export function applyCustomerQuick(q: QuickInput, c: Customer | undefined, projects: Project[]): QuickInput {
  const cp = c && customerPricing(projects, c, undefined as unknown as Settings)
  if (!cp) return q
  return { ...q, business: cp.mode ? cp.mode === 'poslovno' : q.business, printRate: cp.rates.printHourly ?? q.printRate, workRate: cp.rates.labourHourly ?? q.workRate, markupPct: cp.markupPct ?? q.markupPct, ...(cp.matKg ? { matKg: Math.round(cp.matKg * 100) / 100 } : {}) }
}

export function customerTotals(projects: Project[], id: string) {
  const ps = customerProjects(projects, id)
  let total = 0, paid = 0, earnings = 0
  for (const p of ps) { const r = calculate(p.input, p.snapshot); total += r.gross; earnings += r.earnings; if (p.status === 'placano') paid += r.gross }
  return { count: ps.length, total, paid, open: total - paid, earnings }
}
