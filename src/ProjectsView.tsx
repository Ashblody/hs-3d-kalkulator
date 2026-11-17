import { useState } from 'react'
import type { Actuals, Project, ProjectTracking, Status, WorkflowStage, WorkflowStatus } from './types'
import { HoursField, NumField } from './ui'
import { BARE_WORK } from './duration'
import { num } from './format'
import { calculate, isPrinting } from './calc'
import { eur } from './format'

export const statusLabels: Record<Status, string> = { neznano: 'Ni podatka', ponudba: 'Ponudba', sprejeto: 'Sprejeto', natisnjeno: 'Natisnjeno', placano: 'Plačano', opravljeno: 'Opravljeno' }
export const statusColors: Record<Status, string> = { neznano: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100', ponudba: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100', sprejeto: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200', natisnjeno: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200', placano: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200', opravljeno: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200' }

const stages: [WorkflowStage, string][] = [['scan', '3D-sken'], ['mesh', 'Čiščenje mreže'], ['cad', 'CAD'], ['export', 'STEP / STL'], ['slicer', 'Slicer'], ['print', 'Tisk'], ['finish', 'Končna obdelava'], ['handover', 'Predaja']]
const workflowLabels: [WorkflowStatus, string][] = [['unknown', 'Ni podatka'], ['todo', 'Ni začeto'], ['doing', 'V teku'], ['done', 'Končano'], ['not_needed', 'Ni potrebno']]

export default function ProjectsView({ projects, currentId, onOpen, onCopy, onDelete, onStatus, onActual, onTracking, onPdf, onExport }: {
  projects: Project[]; currentId: string | null
  onOpen: (p: Project) => void; onCopy: (p: Project) => void; onDelete: (p: Project) => void; onStatus: (p: Project, s: Status) => void
  onActual: (p: Project, a: Actuals) => void; onPdf: (p: Project) => void; onExport: (p: Project, kind: 'pdf' | 'xlsx') => void
  onTracking: (p: Project, tracking: ProjectTracking) => void
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
        const pr = isPrinting(p.input)
        return (
          <div key={p.id} className={`card ${p.id === currentId ? '!ring-2 !ring-sky-500' : ''}`}>
            <div className="flex justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 dark:text-white truncate"><span className={`mr-2 rounded-full px-2 py-0.5 text-xs ${statusColors[p.status] ?? ''}`}>{statusLabels[p.status] ?? p.status}</span>{p.input.name || '(brez imena)'}</div>
                <div className="text-xs text-slate-500">{p.input.client || '—'} · {p.input.date} · {p.input.mode === 'poslovno' ? 'Poslovno' : 'Osebno'}</div>
                <div className="text-xs text-slate-500">{pr ? `${num(r.kg * 1000)} g · ${num(r.printHours)} h tiska · material ${eur(r.material)}` : `brez tiska · ${num(r.laborHours)} h dela`}</div>
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
              <summary className="text-sm cursor-pointer text-slate-500">Potek, povezave in opombe</summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <label><span className="lbl">Oznaka projekta</span><input className="inp" value={p.tracking?.code ?? ''} onChange={e => onTracking(p, { ...p.tracking, code: e.target.value })} /></label>
                <label><span className="lbl">Datum zaključka (če je znan)</span><input className="inp" type="date" value={p.tracking?.completedDate ?? ''} onChange={e => onTracking(p, { ...p.tracking, completedDate: e.target.value })} /></label>
                {stages.map(([key, label]) => <label key={key}><span className="lbl">{label}</span><select className="inp" value={p.tracking?.stages?.[key] ?? 'unknown'} onChange={e => onTracking(p, { ...p.tracking, stages: { ...p.tracking?.stages, [key]: e.target.value as WorkflowStatus } })}>{workflowLabels.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>)}
                <label className="sm:col-span-2"><span className="lbl">Povezave do datotek (ena na vrstico)</span><textarea className="inp min-h-20" value={p.tracking?.links ?? ''} onChange={e => onTracking(p, { ...p.tracking, links: e.target.value })} /></label>
                <label className="sm:col-span-2"><span className="lbl">Opombe in različice modelov</span><textarea className="inp min-h-20" value={p.tracking?.notes ?? ''} onChange={e => onTracking(p, { ...p.tracking, notes: e.target.value })} /></label>
              </div>
              {!!p.tracking?.links && <div className="mt-2 flex flex-col gap-1">{p.tracking.links.split('\n').map(x => x.trim()).filter(x => /^https?:\/\/\S+$/i.test(x)).map((url, i) => <a key={i} className="text-sm text-sky-700 dark:text-sky-300 underline break-all" href={url} target="_blank" rel="noopener noreferrer">{url}</a>)}</div>}
              <p className="text-xs text-slate-500 mt-2">Shranjujejo se besedilo in povezave, ne velike datoteke STL, OBJ ali STEP. Stanje posameznega koraka ni samodejna potrditev končnega projekta.</p>
            </details>
            <details className="mt-3">
              <summary className="text-sm cursor-pointer text-slate-500">Dejanska poraba vs. ocena</summary>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {pr && <HoursField label="Čas tiska" hours={p.actual.printHours} onChange={(v) => onActual(p, { ...p.actual, printHours: v })} />}
                {pr && <NumField label="Material" suffix="g" value={p.actual.grams} onChange={(v) => onActual(p, { ...p.actual, grams: v })} />}
                <HoursField label="Delo" bareFrom={BARE_WORK} hours={p.actual.laborHours} onChange={(v) => onActual(p, { ...p.actual, laborHours: v })} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mt-1 text-slate-500">
                {pr && <Diff est={r.printHours} act={p.actual.printHours} unit="h" />}
                {pr && <Diff est={r.kg * 1000} act={p.actual.grams} unit="g" />}
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
