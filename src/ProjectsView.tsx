import type { Project, Status } from './types'
import { calculate } from './calc'
import { eur } from './format'

export const statusLabels: Record<Status, string> = { osnutek: 'Osnutek', ponudba: 'Ponudba', potrjeno: 'Potrjeno', izdelava: 'V izdelavi', zakljuceno: 'Zaključeno' }

export default function ProjectsView({ projects, currentId, onOpen, onCopy, onDelete, onStatus }: {
  projects: Project[]; currentId: string | null
  onOpen: (p: Project) => void; onCopy: (p: Project) => void; onDelete: (p: Project) => void; onStatus: (p: Project, s: Status) => void
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
              <button className="btn" onClick={() => confirm('Izbrišem projekt?') && onDelete(p)}>Izbriši</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
