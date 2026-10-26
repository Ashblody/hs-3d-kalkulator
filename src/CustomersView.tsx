import { useState } from 'react'
import type { Customer, CustomerPricing, Project } from './types'
import { calculate } from './calc'
import { customerPricing, customerProjects, customerTotals, newCustomer } from './customers'
import { eur, num } from './format'
import { statusColors, statusLabels } from './ProjectsView'
import { NumField, TextField } from './ui'

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
  const upd = (patch: Partial<Customer>) => c && onChange(customers.map((x) => (x.id === c.id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x)))
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
  const t = customerTotals(projects, c.id); const ps = customerProjects(projects, c.id); const cp = customerPricing(projects, c, undefined as never)
  const [edit, setEdit] = useState(false)
  return (
    <div className="space-y-4 min-w-0" data-testid="customer-detail">
      {edit ? <EditCustomer c={c} cp={cp} onCancel={() => setEdit(false)} onSave={(p) => { upd(p); setEdit(false) }} /> :
      <div className="card">
        <div className="flex justify-between items-start gap-2"><div><div className="text-lg font-bold">{c.name}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{[c.phone, c.email].filter(Boolean).join(' · ') || 'brez kontakta'}</div>{c.note && <div className="text-sm mt-1">{c.note}</div>}</div>
          <div className="flex gap-2"><button className="btn-p" onClick={() => setEdit(true)}>Uredi stranko</button><button className="btn" onClick={onDelete}>Izbriši</button></div></div>
      </div>}
      <div className="card grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        {([['Projektov', String(t.count)], ['Skupaj', eur(t.total)], ['Plačano', eur(t.paid)], ['Odprto', eur(t.open)]] as const).map(([l, v]) =>
          <div key={l}><div className="text-xs text-slate-500">{l}</div><div className="text-lg font-bold tabular-nums">{v}</div></div>)}
      </div>
      {cp && <div className="card text-sm text-slate-600 dark:text-slate-300">{c.pricing && Object.keys(c.pricing).length ? 'Shranjen cenik' : 'Nazadnje'}: <b>{cp.mode === 'poslovno' ? 'Poslovno' : 'Osebno'}</b>{cp.rates.printHourly != null && <> · tisk {eur(cp.rates.printHourly)}/h</>}{cp.rates.labourHourly != null && <> · delo {eur(cp.rates.labourHourly)}/h</>}{cp.matKg != null && <> · material {eur(cp.matKg)}/kg</>} · pribitek {num(cp.markupPct ?? 0)} %{cp.fileSale && cp.fileSale.kind !== 'none' && <> · datoteka {cp.fileSale.kind.toUpperCase()}</>}. To se predizpolni ob izbiri stranke.</div>}
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

function EditCustomer({ c, cp, onSave, onCancel }: { c: Customer; cp: ReturnType<typeof customerPricing>; onSave: (p: Partial<Customer>) => void; onCancel: () => void }) {
  const [d, setD] = useState({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', note: c.note ?? '' })
  const [p, setP] = useState<CustomerPricing>({ mode: cp?.mode ?? 'osebno', printHourly: cp?.rates.printHourly ?? 3.5, labourHourly: cp?.rates.labourHourly ?? 20, matKg: cp?.matKg != null ? Math.round(cp.matKg * 100) / 100 : 20, markupPct: cp?.markupPct ?? 0, fileSale: cp?.fileSale?.kind ?? 'none', ...c.pricing })
  const sp = (k: keyof CustomerPricing) => (v: unknown) => setP({ ...p, [k]: v })
  return (
    <div className="card grid grid-cols-2 gap-3" data-testid="edit-customer">
      <div className="col-span-2 h2">Uredi stranko</div>
      <TextField label="Ime" value={d.name} onChange={(v) => setD({ ...d, name: v })} />
      <TextField label="Telefon" type="tel" value={d.phone} onChange={(v) => setD({ ...d, phone: v })} />
      <TextField label="E-pošta" type="email" value={d.email} onChange={(v) => setD({ ...d, email: v })} />
      <TextField label="Opomba" value={d.note} onChange={(v) => setD({ ...d, note: v })} />
      <div className="col-span-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mt-2">Cenik za to stranko (predizpolni se ob izbiri)</div>
      <NumField label="Tisk" value={p.printHourly ?? 0} onChange={sp('printHourly')} suffix="€/h" step="0.1" />
      <NumField label="Moje delo" value={p.labourHourly ?? 0} onChange={sp('labourHourly')} suffix="€/h" />
      <NumField label="Material (Hitri)" value={p.matKg ?? 0} onChange={sp('matKg')} suffix="€/kg" />
      <NumField label="Dodaten pribitek (Hitri)" value={p.markupPct ?? 0} onChange={sp('markupPct')} suffix="%" />
      <label className="block"><span className="lbl">Cenik</span><select className="inp" value={p.mode} onChange={(e) => sp('mode')(e.target.value)}><option value="osebno">Osebno</option><option value="poslovno">Poslovno (×2)</option></select></label>
      <label className="block"><span className="lbl">Datoteka</span><select className="inp" value={p.fileSale} onChange={(e) => sp('fileSale')(e.target.value)}><option value="none">Brez</option><option value="stl">STL</option><option value="step">STEP</option></select></label>
      <div className="col-span-2 text-xs text-slate-500">Zaokroževanje je skupno za vse stranke (Nastavitve).</div>
      <div className="col-span-2 flex justify-end gap-2">
        <button className="btn" onClick={() => onSave({ pricing: undefined })} title="Uporabi spet zadnji projekt">Ponastavi cenik</button>
        <button className="btn" onClick={onCancel}>Prekliči</button>
        <button className="btn-p" onClick={() => d.name.trim() && onSave({ ...d, name: d.name.trim(), pricing: p })}>Shrani</button>
      </div>
    </div>
  )
}
