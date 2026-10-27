import { useEffect, useState } from 'react'
import type { Customer, JobInput, Project, Settings } from './types'
import { CustomerPicker } from './CustomersView'
import { applyCustomerQuick } from './customers'
import { copyText, quickToProject, quickCalc, quickCompare, quickDefaults, quickFloor, quickText, type QuickInput } from './quick'
import { eur, num } from './format'
import { Check, HoursField, NumField, Row } from './ui'
import { BARE_WORK } from './duration'
import FloorBox from './FloorBox'

const KEY = 'hs3d-hitri'
const load = (): QuickInput => { try { return { ...quickDefaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return quickDefaults } }

export default function Quick({ settings, flash, onSave, customers, projects, onCreateCustomer }: { settings: Settings; flash: (m: string) => void; onSave: (p: { input: JobInput; snapshot: Settings }) => void; customers: Customer[]; projects: Project[]; onCreateCustomer: (c: Customer) => void }) {
  const [cust, setCust] = useState<Customer | undefined>()
  const [q, setQ] = useState<QuickInput>(load)
  const [name, setName] = useState('')
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(q)) }, [q])
  const set = (k: keyof QuickInput) => (v: number | boolean) => setQ({ ...q, [k]: v })
  const qq: QuickInput = { ...q, roundTo: settings.rates.roundTo }
  const r = quickCalc(qq); const c = quickCompare(q, settings)
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="card grid grid-cols-2 gap-3 self-start">
        <div className="col-span-2"><CustomerPicker customers={customers} value={cust?.id} onCreate={onCreateCustomer} onPick={(c) => { setCust(c); setQ(applyCustomerQuick(q, c, projects)) }} /></div>
        <HoursField label="Čas tiskanja" hours={q.printH} onChange={set('printH')} />
        <NumField label="Teža materiala" value={q.grams} onChange={set('grams')} suffix="g" />
        <HoursField label="Tvoj čas (delo)" hours={q.workH} onChange={set('workH')} bareFrom={BARE_WORK} />
        <NumField label="Cena materiala" value={q.matKg} onChange={set('matKg')} suffix="€/kg" />
        <NumField label="Tiskanje" value={q.printRate} onChange={set('printRate')} suffix="€/h" />
        <NumField label="Delo" value={q.workRate} onChange={set('workRate')} suffix="€/h" />
        <label className="col-span-2 block"><span className="lbl">Dodaten pribitek: {q.markupPct} %</span>
          <input type="range" min={0} max={100} step={1} className="w-full h-8 accent-orange-500" value={q.markupPct} onChange={(e) => set('markupPct')(Number(e.target.value))} /></label>
        <div className="col-span-2"><Check label="Prikaži višji cenik (2×) za poslovne stranke" checked={q.business} onChange={set('business')} /></div>
      </div>
      <div className="space-y-4 self-start">
        <div className="card">
          <Row l={`Tiskanje ${num(q.printH)} h × ${num(q.printRate)} €/h`} v={eur(r.print)} /><Row l={`Material ${num(q.grams)} g × ${num(q.matKg)} €/kg`} v={eur(r.material)} /><Row l={`Delo ${num(q.workH)} h × ${num(q.workRate)} €/h`} v={eur(r.work)} /><Row l="Pribitek" v={eur(r.markup)} />
          {r.rounding > 0 && <Row l={`Zaokroženo navzgor na ${settings.rates.roundTo} € (${eur(r.exact)})`} v={`+${eur(r.rounding)}`} />}
          <div className="flex justify-between items-baseline mt-2 pt-2 border-t border-slate-200 dark:border-slate-700"><span className="font-bold">KONČNA CENA</span><span className="text-3xl font-black tabular-nums" data-testid="quick-total">{eur(r.total)}</span></div>
          {q.business && <div className="flex justify-between items-baseline"><span className="font-semibold">Poslovne stranke (2×)</span><span className="text-2xl font-black tabular-nums text-emerald-600" data-testid="quick-business">{eur(r.business)}</span></div>}
          <FloorBox f={quickFloor(qq, settings)} biz={q.business} rate={q.workRate} />
          <button className="btn-p w-full mt-3" onClick={async () => flash((await copyText(quickText(qq))) ? 'Izračun kopiran' : 'Kopiranje ni uspelo')}>Kopiraj izračun</button>
          <div className="flex gap-2 mt-2">
            <input className="inp" placeholder="Ime projekta" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn whitespace-nowrap" onClick={() => { onSave(quickToProject(qq, name, settings, cust)); setName('') }}>Shrani kot projekt</button>
          </div>
        </div>
        <div className="card text-sm text-slate-600 dark:text-slate-300">Podrobni kalkulator (Na roke, PLA, z elektriko in obrabo, zaokroženo): <b>{eur(c.detailed)}</b> · razlika {c.diff >= 0 ? '+' : ''}{eur(c.diff)}</div>
      </div>
    </div>
  )
}
