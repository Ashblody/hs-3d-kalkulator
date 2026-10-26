import type { Material, Printer, Settings, Rates, Business } from './types'
import { pricePerKg, wearPerHour } from './calc'
import { eur, num, uid } from './format'
import { Check, NumField, TextField } from './ui'
import { defaultSettings } from './seed'

export default function SettingsView({ s, onChange }: { s: Settings; onChange: (s: Settings) => void }) {
  const types = Array.from(new Set(s.materials.map((m) => m.type)))
  const setP = (i: number, p: Partial<Printer>) => onChange({ ...s, printers: s.printers.map((x, j) => (j === i ? { ...x, ...p } : x)) })
  const setM = (i: number, p: Partial<Material>) => onChange({ ...s, materials: s.materials.map((x, j) => (j === i ? { ...x, ...p } : x)) })
  const setR = (k: keyof Rates) => (v: number) => onChange({ ...s, rates: { ...s.rates, [k]: v } })
  const setB = <K extends keyof Business>(k: K) => (v: Business[K]) => onChange({ ...s, business: { ...s.business, [k]: v } })

  return (
    <div className="space-y-4">
      <details className="card" open>
        <summary className="cursor-pointer font-semibold">Cenik storitev</summary>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumField label="Tisk: € na uro tiskalnika (material posebej)" value={s.rates.printHourly} onChange={setR('printHourly')} suffix="€/h" />
          <NumField label="Moje delo (sken, obdelava, CAD, slicer)" value={s.rates.labourHourly} onChange={setR('labourHourly')} suffix="€/h" />
          <NumField label="Poslovno (z računom): faktor" value={s.rates.invoiceMultiplier} onChange={setR('invoiceMultiplier')} suffix="×" />
          <NumField label="Prevoz" value={s.rates.km} onChange={setR('km')} suffix="€/km" />
          <NumField label="Minimalno naročilo" value={s.rates.minOrder} onChange={setR('minOrder')} suffix="€" />
          <NumField label="Privzeta rezerva" value={s.rates.reservePct} onChange={setR('reservePct')} suffix="%" />
          <label className="block"><span className="lbl">Zaokroževanje ponudbe (navzgor)</span>
            <select className="inp" value={s.rates.roundTo} onChange={(e) => setR('roundTo')(Number(e.target.value))}><option value={0}>Izklop</option><option value={1}>Na 1 €</option><option value={5}>Na 5 €</option></select></label>
          <NumField label="Doplačilo: STL zraven tiska" value={s.rates.fileAddonStl} onChange={setR('fileAddonStl')} suffix="€" />
          <NumField label="Doplačilo: STEP zraven tiska" value={s.rates.fileAddonStep} onChange={setR('fileAddonStep')} suffix="€" />
        </div>
      </details>

      <details className="card" open>
        <summary className="cursor-pointer font-semibold">Poslovne nastavitve in davki</summary>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NumField label="Ciljna osebna postavka" value={s.business.targetHourly} onChange={setB('targetHourly')} suffix="€/h" />
          <NumField label="Obračunljive ure na mesec" value={s.business.billableHours} onChange={setB('billableHours')} suffix="h" />
          <NumField label="Prispevki in administracija" value={s.business.monthlyFixed} onChange={setB('monthlyFixed')} suffix="€/mes" />
          <NumField label="Cena elektrike" value={s.business.kwhPrice} onChange={setB('kwhPrice')} suffix="€/kWh" />
          <NumField label="Davčna rezerva (od prihodka)" value={s.business.taxPct} onChange={setB('taxPct')} suffix="%" />
          <NumField label="Stopnja DDV" value={s.business.vatPct} onChange={setB('vatPct')} suffix="%" />
          <div className="col-span-2"><Check label="Obračunavam DDV" checked={s.business.vatEnabled} onChange={setB('vatEnabled')} /></div>
        </div>
        <p className="text-xs text-slate-500 mt-2">Davčna rezerva je privzeto 0 %, ker je odvisna od tvojega statusa (normiranec, dejanski stroški). Vnesi svojo oceno.</p>
      </details>

      <details className="card" open>
        <summary className="cursor-pointer font-semibold">Tiskalniki</summary>
        <div className="mt-3 space-y-3">
          {s.printers.map((p, i) => (
            <div key={p.id} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 dark:ring-1 dark:ring-slate-700/60 p-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="col-span-2"><TextField label="Naziv" value={p.name} onChange={(name) => setP(i, { name })} /></div>
                <NumField label="Nabavna cena" value={p.price} onChange={(price) => setP(i, { price })} suffix="€" />
                <NumField label="Življenjska doba" value={p.lifeHours} onChange={(lifeHours) => setP(i, { lifeHours })} suffix="h" />
                <NumField label="Servisni stroški (v dobi)" value={p.service} onChange={(service) => setP(i, { service })} suffix="€" />
                <NumField label="Moč – privzeto" value={p.powerW.default ?? 0} onChange={(v) => setP(i, { powerW: { ...p.powerW, default: v } })} suffix="W" />
                {types.map((t) => <NumField key={t} label={`Moč – ${t}`} value={p.powerW[t] ?? p.powerW.default ?? 0} onChange={(v) => setP(i, { powerW: { ...p.powerW, [t]: v } })} suffix="W" />)}
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-emerald-600 font-semibold">Amortizacija {num(wearPerHour(p))} €/h</span>
                <button className="btn" onClick={() => confirm(`Izbrišem ${p.name}?`) && onChange({ ...s, printers: s.printers.filter((_, j) => j !== i) })}>Izbriši</button>
              </div>
              {p.note && <p className="text-xs text-slate-500">{p.note}</p>}
            </div>
          ))}
          <button className="btn" onClick={() => onChange({ ...s, printers: [...s.printers, { id: uid(), name: 'Nov tiskalnik', price: 0, lifeHours: 3000, service: 0, powerW: { default: 0 } }] })}>+ Dodaj tiskalnik</button>
          <p className="text-xs text-slate-500">Moči so ocene, dokler jih ne zamenjaš z izmerjenimi (npr. pametna vtičnica).</p>
        </div>
      </details>

      <details className="card">
        <summary className="cursor-pointer font-semibold">Materiali</summary>
        <div className="mt-3 space-y-3">
          {s.materials.map((m, i) => (
            <div key={m.id} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 dark:ring-1 dark:ring-slate-700/60 p-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="col-span-2"><TextField label="Naziv" value={m.name} onChange={(name) => setM(i, { name })} /></div>
                <TextField label="Proizvajalec" value={m.maker} onChange={(maker) => setM(i, { maker })} />
                <TextField label="Vrsta" value={m.type} onChange={(type) => setM(i, { type })} />
                <NumField label="Neto masa koluta" value={m.spoolG} onChange={(spoolG) => setM(i, { spoolG })} suffix="g" />
                <TextField label="Temp. sušenja" value={m.dryTemp ?? ''} onChange={(dryTemp) => setM(i, { dryTemp })} />
              </div>
              <div className="mt-2 space-y-2">
                {m.prices.map((pr, k) => (
                  <div key={k} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-end">
                    <input type="radio" className="h-5 w-5 mb-3 accent-orange-500" checked={m.activePrice === k} onChange={() => setM(i, { activePrice: k })} title="Uporabi to ceno" />
                    <TextField label="Cena" value={pr.label} onChange={(label) => setM(i, { prices: m.prices.map((x, j) => (j === k ? { ...x, label } : x)) })} />
                    <NumField label="Plačano za kolut" value={pr.price} onChange={(price) => setM(i, { prices: m.prices.map((x, j) => (j === k ? { ...x, price } : x)) })} suffix="€" />
                    <button className="btn mb-0.5" disabled={m.prices.length < 2} onClick={() => setM(i, { prices: m.prices.filter((_, j) => j !== k), activePrice: 0 })}>×</button>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-emerald-600 font-semibold">{eur(pricePerKg(m))}/kg{m.source && <a className="ml-2 text-xs text-orange-600 underline font-normal" href={m.source} target="_blank" rel="noreferrer">vir cene</a>}</span>
                <div className="flex gap-2">
                  <button className="btn" onClick={() => setM(i, { prices: [...m.prices, { label: 'Akcijska', price: m.prices[0]?.price ?? 0 }] })}>+ cena</button>
                  <button className="btn" onClick={() => confirm(`Izbrišem ${m.name}?`) && onChange({ ...s, materials: s.materials.filter((_, j) => j !== i) })}>Izbriši</button>
                </div>
              </div>
            </div>
          ))}
          <button className="btn" onClick={() => onChange({ ...s, materials: [...s.materials, { id: uid(), name: 'Nov material', maker: '', type: 'PLA', spoolG: 1000, prices: [{ label: 'Redna', price: 0 }], activePrice: 0 }] })}>+ Dodaj material</button>
        </div>
      </details>

      <button className="btn" onClick={() => confirm('Ponastavim cenik, tiskalnike in materiale na začetne vrednosti? Projekti ostanejo.') && onChange(defaultSettings())}>Ponastavi na začetne vrednosti</button>
    </div>
  )
}
