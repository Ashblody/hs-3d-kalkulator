import { useState } from 'react'
import type { Customer, Project } from './types'
import { calculate } from './calc'
import { customerProjects, customerTotals, lastPricing, newCustomer } from './customers'
import { eur, num } from './format'
import { statusColors, statusLabels } from './ProjectsView'
import { TextField } from './ui'

/** Izbira stranke (z možnostjo nove) */
export function CustomerPicker({ customers, value, onPick, onCreate }: { customers: Customer[]; value?: string; onPick: (c: Customer | undefined) => void; onCreate: (c: Customer) => void }) {
  return (
    <label className="block"><span className="lbl">Stranka iz seznama</span>
      <select className="inp" data-testid="customer-picker" value={value ?? ''} onChange={(e) => {
        const v = e.target.value
        if (v === '__new') { const n = prompt('Ime nove stranke'); if (n?.trim()) { const c = newCustomer(n); onCreate(c); onPick(c) } return }
        onPick(customers.find((c) => c.id === v))
      }}>
        <option value="">— brez —</option>
        {[...customers].sort((a, b) => a.name.localeCompare(b.name, 'sl')).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        <option value="__new">+ Nova stranka …</option>
      </select>
    </label>
  )
}

export default function CustomersView({ customers, projects, onChange, onOpen }: { customers: Customer[]; projects: Project[]; onChange: (c: Customer[]) => void; onOpen: (p: Project) => void }) {
  const [sel, setSel] = useState<string | null>(customers[0]?.id ?? null)
  const [name, setName] = useState('')
  const c = customers.find((x) => x.id === sel)
  const upd = (patch: Partial<Customer>) => c && onChange(customers.map((x) => (x.id === c.id ? { ...x, ...patch } : x)))
  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-4">
      <div className="card self-start space-y-2">
        <div className="flex gap-2">
          <input className="inp" placeholder="Ime nove stranke" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-p whitespace-nowrap" onClick={() => { if (!name.trim()) return; const n = newCustomer(name); onChange([...customers, n]); setSel(n.id); setName('') }}>Dodaj</button>
        </div>
        {!customers.length && <div className="text-sm text-slate-500">Ni strank. Dodaj jo tukaj ali v kalkulatorju (Stranka iz seznama → Nova stranka).</div>}
        {[...customers].sort((a, b) => a.name.localeCompare(b.name, 'sl')).map((x) => {
          const t = customerTotals(projects, x.id)
          return <button key={x.id} onClick={() => setSel(x.id)} className={`w-full text-left rounded-xl px-3 py-2 ${x.id === sel ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
            <div className="font-semibold">{x.name}</div><div className="text-xs opacity-75">{t.count} projektov · {eur(t.total)}</div></button>
        })}
      </div>
      {c && <CustomerDetail c={c} projects={projects} upd={upd} onOpen={onOpen} onDelete={() => { if (confirm(`Izbrišem stranko ${c.name}? Projekti ostanejo.`)) { onChange(customers.filter((x) => x.id !== c.id)); setSel(null) } }} />}
    </div>
  )
}

function CustomerDetail({ c, projects, upd, onOpen, onDelete }: { c: Customer; projects: Project[]; upd: (p: Partial<Customer>) => void; onOpen: (p: Project) => void; onDelete: () => void }) {
  const t = customerTotals(projects, c.id); const ps = customerProjects(projects, c.id); const lp = lastPricing(projects, c.id)
  return (
    <div className="space-y-4 min-w-0" data-testid="customer-detail">
      <div className="card grid grid-cols-2 gap-3">
        <TextField label="Ime" value={c.name} onChange={(v) => upd({ name: v })} />
        <TextField label="Telefon" type="tel" value={c.phone ?? ''} onChange={(v) => upd({ phone: v })} />
        <TextField label="E-pošta" type="email" value={c.email ?? ''} onChange={(v) => upd({ email: v })} />
        <TextField label="Opomba" value={c.note ?? ''} onChange={(v) => upd({ note: v })} />
        <div className="col-span-2 flex justify-end"><button className="btn" onClick={onDelete}>Izbriši stranko</button></div>
      </div>
      <div className="card grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        {([['Projektov', String(t.count)], ['Skupaj', eur(t.total)], ['Plačano', eur(t.paid)], ['Odprto', eur(t.open)]] as const).map(([l, v]) =>
          <div key={l}><div className="text-xs text-slate-500">{l}</div><div className="text-lg font-bold tabular-nums">{v}</div></div>)}
      </div>
      {lp && <div className="card text-sm text-slate-600 dark:text-slate-300">Nazadnje: <b>{lp.mode === 'poslovno' ? 'Poslovno' : 'Osebno'}</b> · tisk {eur(lp.rates.printHourly)}/h · delo {eur(lp.rates.labourHourly)}/h · rezerva {num(lp.reservePct)} % · pribitek {num(lp.quickMarkupPct ?? lp.markupPct)} %. To se predizpolni ob izbiri stranke.</div>}
      <div className="card space-y-2">
        <div className="font-semibold">Zgodovina projektov</div>
        {!ps.length && <div className="text-sm text-slate-500">Še ni projektov za to stranko.</div>}
        {ps.map((p) => { const r = calculate(p.input, p.snapshot); return (
          <button key={p.id} onClick={() => onOpen(p)} className="w-full flex justify-between gap-2 text-left border-b border-slate-200 dark:border-slate-700 py-2">
            <span className="min-w-0 truncate"><span className={`mr-2 rounded-full px-2 py-0.5 text-xs ${statusColors[p.status]}`}>{statusLabels[p.status]}</span>{p.input.name}<span className="text-xs text-slate-500"> · {p.input.date}</span></span>
            <span className="font-semibold tabular-nums">{eur(r.gross)}</span></button>) })}
      </div>
    </div>
  )
}
