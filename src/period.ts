import type { Project } from './types'

export const billable = new Set(['sprejeto', 'natisnjeno', 'placano', 'opravljeno'])
export const MESECI = ['januar', 'februar', 'marec', 'april', 'maj', 'junij', 'julij', 'avgust', 'september', 'oktober', 'november', 'december']

export type Period = { kind: 'month'; ym: string } | { kind: 'year'; year: number }

export function localYM(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${MESECI[(m || 1) - 1] ?? ym} ${y}`
}
export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const t = y * 12 + (m - 1) + delta
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}
export function periodProjects(projects: Project[], p: Period): Project[] {
  const prefix = p.kind === 'month' ? p.ym : String(p.year)
  return projects.filter((x) => billable.has(x.status) && (x.input.date ?? '').startsWith(prefix))
}
/** Mesecev fiksnih stroškov: mesec = 1; leto = 12, tekoče leto = pretekli meseci do vključno tekočega. */
export function fixedMonths(p: Period, now = new Date()): number {
  if (p.kind === 'month') return 1
  return p.year === now.getFullYear() ? now.getMonth() + 1 : 12
}
/** Meseci s projekti (obračunljivi) + tekoči mesec, od najnovejšega. */
export function monthOptions(projects: Project[], now = new Date(), extra?: string): string[] {
  const s = new Set<string>([localYM(now)])
  if (extra) s.add(extra)
  for (const p of projects) if (billable.has(p.status) && /^\d{4}-\d{2}/.test(p.input.date ?? '')) s.add(p.input.date.slice(0, 7))
  return [...s].sort().reverse()
}
export function yearOptions(projects: Project[], now = new Date(), extra?: number): number[] {
  const s = new Set<number>([now.getFullYear()])
  if (extra) s.add(extra)
  for (const p of projects) if (billable.has(p.status) && /^\d{4}/.test(p.input.date ?? '')) s.add(Number(p.input.date.slice(0, 4)))
  return [...s].sort((a, b) => b - a)
}
