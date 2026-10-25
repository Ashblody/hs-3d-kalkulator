import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Project, Settings } from './types'
import { calculate, monthlyPlan } from './calc'
import { eur, num } from './format'
import { Big, Row } from './ui'

const billable = new Set(['sprejeto', 'natisnjeno', 'placano'])

export default function Dashboard({ projects, settings }: { projects: Project[]; settings: Settings }) {
  const month = new Date().toISOString().slice(0, 7)
  const inMonth = projects.filter((p) => billable.has(p.status) && p.input.date.startsWith(month) && p.input.mode !== 'zase')
  let revenue = 0, costs = 0, hours = 0, tax = 0
  for (const p of inMonth) { const r = calculate(p.input, p.snapshot); revenue += r.net; costs += r.realCosts; hours += r.laborHours; tax += r.tax }
  const b = settings.business
  const result = revenue - costs - b.monthlyFixed - tax
  const r = settings.rates
  const avgRate = (r.scan + r.edit + r.cad + r.reverse + r.prep) / 5
  const plan = monthlyPlan(settings, avgRate)
  const data = [
    { name: 'Prihodki', v: revenue, c: '#0ea5e9' }, { name: 'Stroški', v: costs, c: '#f97316' },
    { name: 'Fiksni', v: b.monthlyFixed, c: '#64748b' }, { name: 'Davek', v: tax, c: '#a855f7' }, { name: 'Rezultat', v: result, c: result >= 0 ? '#22c55e' : '#ef4444' },
  ]
  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-500">Mesec {month} · upoštevani projekti s statusom sprejeto, natisnjeno ali plačano ({inMonth.length})</div>
      {inMonth.length === 0 && <div className="card text-sm text-orange-700 dark:text-orange-300">Ta mesec še ni projektov s statusom Sprejeto, Natisnjeno ali Plačano, zato so prihodki 0. V zavihku Projekti nastavi status (ponudbe se ne štejejo).{b.monthlyFixed > 0 ? '' : ' Prispevki so 0 €, zato je rezultat 0 €.'}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Big label="Prihodki" value={eur(revenue)} />
        <Big label="Stroški + fiksni + davek" value={eur(costs + b.monthlyFixed + tax)} tone="slate" />
        <Big label="Predvideni rezultat" value={eur(result)} tone={result >= 0 ? 'green' : 'red'} />
        <Big label="Obračunljive ure" value={`${num(hours)} / ${num(b.billableHours)} h`} tone="slate" sub={hours > 0 ? `${eur(result / hours)}/h` : undefined} />
      </div>
      <div className="card"><div className="h2">Ta mesec</div>
        <div className="h-64"><ResponsiveContainer><BarChart data={data}><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={11} /><Tooltip formatter={(v: number) => eur(v)} /><Bar dataKey="v">{data.map((d) => <Cell key={d.name} fill={d.c} />)}</Bar></BarChart></ResponsiveContainer></div>
      </div>
      <div className="card">
        <div className="h2">Načrt po ceniku</div>
        <Row l={`${num(b.billableHours)} h × povprečna postavka ${eur(avgRate)}/h`} v={eur(plan.revenue)} />
        <Row l="− prispevki in administracija" v={eur(plan.fixed)} />
        <Row l={`− ocena davka (${num(b.taxPct)} %)`} v={eur(plan.tax)} />
        <Row l="Predvideni osebni zaslužek" v={eur(plan.result)} strong />
        <Row l="Na uro" v={`${eur(plan.hourly)}/h (cilj ${eur(b.targetHourly)}/h)`} />
        {!plan.ok && <div className="mt-2 text-sm text-orange-600">Pri {num(b.billableHours)} h na mesec cenik ne doseže cilja {eur(b.targetHourly)}/h. Dvigni postavke ali število ur.</div>}
        <p className="mt-2 text-xs text-slate-500">Prodajna cena dela ni čisti zaslužek: odšteti so fiksni stroški in davek. Stroški materiala so pri projektih upoštevani posebej.</p>
      </div>
    </div>
  )
}
