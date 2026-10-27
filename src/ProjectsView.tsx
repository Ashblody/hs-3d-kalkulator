import { useState } from 'react'
import type { Actuals, Project, Status } from './types'
import { NumField } from './ui'
import { num } from './format'
import { calculate } from './calc'
import { eur } from './format'

export const statusLabels: Record<Status, string> = { ponudba: 'Ponudba', sprejeto: 'Sprejeto', natisnjeno: 'Natisnjeno', placano: 'Plačano', opravljeno: 'Opravljeno' }
export const statusColors: Record<Status, string> = { ponudba: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100', sprejeto: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200', natisnjeno: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200', placano: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200', opravljeno: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200' }

export default function ProjectsView({ projects, currentId, onOpen, onCopy, onDelete, onStatus, onActual, onPdf, onExport }: {
  projects: Project[]; currentId: string | null
  onOpen: (p: Project) => void; onCopy: (p: Project) => void; onDelete: (p: Project) => void; onStatus: (p: Project, s: Status) => void
  onActual: (p: Project, a: Actuals) => void; onPdf: (p: Project) => void; onExport: (p: Project, kind: 'pdf' | 'xlsx') => void
}) {
  const [filter, setFilter] = useState<Status | 'vsi'>('vsi')
  if (!projects.length) return <div className="card text-slate-500">Ni shranjenih projektov.</div>
  const sorted = [...projects].filter((p) => filter === 'vsi' || p.status === filter).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap gap-2 items-center no-print">
        <span className="text-sm text-slate-500">Filter:</span>
        {(['vsi', ...Object.keys(statusLabels)] as (Status | 'vsi')[]).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === k ? 'ring-2 ring-sky-500 ' : ''}${k === 'vsi' ? 'bg-white dark:bg-slate-800' : statusColors[k]}`}>
            {k === 'vsi' ? `Vsi (${projects.length})` : `${statusLabels[k]} (${projects.filter((p) => p.status === k).length})`}
          </button>))}
      </div>
      {!sorted.length && <div className="card text-slate-500">Ni projektov s tem statusom.</div>}
      {sorted.map((p) => {
        const r = calculate(p.input, p.snapshot)
        return (
          <div key={p.id} className={`card ${p.id === currentId ? '!ring-2 !ring-sky-500' : ''}`}>
            <div className="flex justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 dark:text-white truncate"><span className={`mr-2 rounded-full px-2 py-0.5 text-xs ${statusColors[p.status] ?? ''}`}>{statusLabels[p.status] ?? p.status}</span>{p.input.name || '(brez imena)'}</div>
                <div className="text-xs text-slate-500">{p.input.client || '—'} · {p.input.date} · {p.input.mode === 'poslovno' ? 'Poslovno' : 'Osebno'}</div>
                <div className="text-xs text-slate-500">{num(r.kg * 1000)} g · {num(r.printHours)} h tiska · material {eur(r.material)}</div>
              </div>
              <div className="text-right"><div className="font-bold text-emerald-600">{eur(r.gross)}</div><div className="text-xs text-slate-500">zaslužek {eur(r.earnings)}</div></div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 items-center">
              <select className="inp !w-auto !py-1 text-sm" value={p.status} onChange={(e) => onStatus(p, e.target.value as Status)}>
                {Object.entries(statusLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <button className="btn-p" onClick={() => onOpen(p)}>Odpri</button>
              <button className="btn" onClick={() => onCopy(p)}>Podvoji projekt</button>
              <button className="btn" onClick={() => onExport(p, 'pdf')}>Izvozi PDF</button>
              <button className="btn" onClick={() => onExport(p, 'xlsx')}>Izvozi Excel</button>
              <button className="btn" title="Natisni ali Shrani kot PDF v brskalniku" onClick={() => onPdf(p)}>Natisni</button>
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
