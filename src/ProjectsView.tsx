import type { Actuals, Project, Status } from './types'
import { NumField } from './ui'
import { num } from './format'
import { calculate } from './calc'
import { eur } from './format'

export const statusLabels: Record<Status, string> = { osnutek: 'Osnutek', ponudba: 'Ponudba', potrjeno: 'Potrjeno', izdelava: 'V izdelavi', zakljuceno: 'Zaključeno' }

export default function ProjectsView({ projects, currentId, onOpen, onCopy, onDelete, onStatus, onActual, onPdf }: {
  projects: Project[]; currentId: string | null
  onOpen: (p: Project) => void; onCopy: (p: Project) => void; onDelete: (p: Project) => void; onStatus: (p: Project, s: Status) => void
  onActual: (p: Project, a: Actuals) => void; onPdf: (p: Project) => void
}) {
  if (!projects.length) return <div className="card text-slate-500">Ni shranjenih projektov.</div>
  const sorted = [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return (
    <div className="space-y-3">
      {sorted.map((p) => {
        const r = calculate(p.input, p.snapshot)
        return (
          <div key={p.id} className={`card ${p.id === currentId ? '!ring-2 !ring-sky-500' : ''}`}>
            <div className="flex justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 dark:text-white truncate">{p.input.name}</div>
                <div className="text-xs text-slate-500">{p.input.client || '—'} · {p.input.date} · {p.input.mode}</div>
              </div>
              <div className="text-right"><div className="font-bold text-emerald-600">{eur(r.gross)}</div><div className="text-xs text-slate-500">zaslužek {eur(r.earnings)}</div></div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 items-center">
              <select className="inp !w-auto !py-1 text-sm" value={p.status} onChange={(e) => onStatus(p, e.target.value as Status)}>
                {Object.entries(statusLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <button className="btn-p" onClick={() => onOpen(p)}>Odpri</button>
              <button className="btn" onClick={() => onCopy(p)}>Kopiraj</button>
              <button className="btn" onClick={() => onPdf(p)}>PDF ponudba</button>
              <button className="btn" onClick={() => confirm('Izbrišem projekt?') && onDelete(p)}>Izbriši</button>
            </div>
            <details className="mt-3">
              <summary className="text-sm cursor-pointer text-slate-500">Dejanska poraba vs. ocena</summary>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <NumField label="Čas tiska" suffix="h" value={p.actual.printHours} onChange={(v) => onActual(p, { ...p.actual, printHours: v })} />
                <NumField label="Material" suffix="g" value={p.actual.grams} onChange={(v) => onActual(p, { ...p.actual, grams: v })} />
                <NumField label="Delo" suffix="h" value={p.actual.laborHours} onChange={(v) => onActual(p, { ...p.actual, laborHours: v })} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mt-1 text-slate-500">
                <Diff est={r.printHours} act={p.actual.printHours} unit="h" />
                <Diff est={r.kg * 1000} act={p.actual.grams} unit="g" />
                <Diff est={r.laborHours} act={p.actual.laborHours} unit="h" />
              </div>
            </details>
          </div>
        )
      })}
    </div>
  )
}

function Diff({ est, act, unit }: { est: number; act: number; unit: string }) {
  if (!act) return <span>ocena {num(est)} {unit}</span>
  const d = act - est
  return <span>ocena {num(est)} {unit} · <b className={d > 0 ? 'text-red-500' : 'text-emerald-600'}>{d > 0 ? '+' : ''}{num(d)} {unit}{est > 0 ? ` (${d > 0 ? '+' : ''}${num((d / est) * 100)} %)` : ''}</b></span>
}
