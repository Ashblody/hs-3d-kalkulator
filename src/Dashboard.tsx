import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useState } from 'react'
import type { Project, Settings } from './types'
import { type Period, localYM, monthLabel, shiftMonth, periodProjects, fixedMonths, monthOptions, yearOptions } from './period'
import { calculate, monthlyPlan } from './calc'
import { eur, num } from './format'
import { Big, Row } from './ui'

export default function Dashboard({ projects, settings }: { projects: Project[]; settings: Settings }) {
  const [period, setPeriod] = useState<Period>({ kind: 'month', ym: localYM() })
  const isYear = period.kind === 'year'
  const inMonth = periodProjects(projects, period)
  const nMonths = fixedMonths(period)
  const b = settings.business
  const fixed = b.monthlyFixed * nMonths
  let revenue = 0, costs = 0, hours = 0, tax = 0
  for (const p of inMonth) { const r = calculate(p.input, p.snapshot); revenue += r.net; costs += r.realCosts; hours += r.laborHours; tax += r.tax }
  const result = revenue - costs - fixed - tax
  const r = settings.rates
  const avgRate = (r.scan + r.edit + r.cad + r.reverse + r.prep) / 5
  const plan = monthlyPlan(settings, avgRate)
  const planN = isYear ? nMonths : 1
  const label = isYear ? `Leto ${period.year}` : monthLabel(period.ym)
  const months = monthOptions(projects, new Date(), period.kind === 'month' ? period.ym : undefined)
  const years = yearOptions(projects, new Date(), isYear ? period.year : undefined)
  const data = [
    { name: 'Prihodki', v: revenue, c: '#0ea5e9' }, { name: 'Stroški', v: costs, c: '#f97316' },
    { name: 'Fiksni', v: fixed, c: '#64748b' }, { name: 'Davek', v: tax, c: '#a855f7' }, { name: 'Rezultat', v: result, c: result >= 0 ? '#22c55e' : '#ef4444' },
  ]
  const btn = 'px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-sm'
  const on = 'bg-sky-600 text-white border-sky-600'
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2" data-testid="period">
        <button type="button" className={`${btn} ${!isYear ? on : ''}`} onClick={() => setPeriod({ kind: 'month', ym: localYM() })}>Mesec</button>
        <button type="button" className={`${btn} ${isYear ? on : ''}`} onClick={() => setPeriod({ kind: 'year', year: Number(localYM().slice(0, 4)) })}>Celo leto</button>
        {period.kind === 'month' ? (<>
          <button type="button" className={btn} aria-label="Prejšnji mesec" onClick={() => setPeriod({ kind: 'month', ym: shiftMonth(period.ym, -1) })}>‹</button>
          <select className={btn} aria-label="Mesec" value={period.ym} onChange={(e) => setPeriod({ kind: 'month', ym: e.target.value })}>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
          <button type="button" className={btn} aria-label="Naslednji mesec" onClick={() => setPeriod({ kind: 'month', ym: shiftMonth(period.ym, 1) })}>›</button>
        </>) : (<>
          <button type="button" className={btn} aria-label="Prejšnje leto" onClick={() => setPeriod({ kind: 'year', year: period.year - 1 })}>‹</button>
          <select className={btn} aria-label="Leto" value={period.year} onChange={(e) => setPeriod({ kind: 'year', year: Number(e.target.value) })}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
          <button type="button" className={btn} aria-label="Naslednje leto" onClick={() => setPeriod({ kind: 'year', year: period.year + 1 })}>›</button>
        </>)}
      </div>
      <div className="text-sm text-slate-500">{isYear ? `Celo leto ${period.year}` : `Mesec ${label}`} · upoštevani projekti s statusom sprejeto, natisnjeno, plačano ali opravljeno ({inMonth.length}){isYear && ` · fiksni stroški: ${eur(b.monthlyFixed)} × ${nMonths} mes. (${period.year === new Date().getFullYear() ? 'od januarja do vključno tega meseca' : 'celo leto'})`}</div>
      {inMonth.length === 0 && <div className="card text-sm text-orange-700 dark:text-orange-300">{isYear ? `V letu ${period.year} še ni` : 'V tem mesecu ni'} projektov s statusom Sprejeto, Natisnjeno, Plačano ali Opravljeno, zato so prihodki 0. V zavihku Projekti nastavi status (ponudbe se ne štejejo).{b.monthlyFixed > 0 ? '' : ' Prispevki so 0 €, zato je rezultat 0 €.'}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Big label="Prihodki" value={eur(revenue)} />
        <Big label="Stroški + fiksni + davek" value={eur(costs + fixed + tax)} tone="slate" />
        <Big label="Predvideni rezultat" value={eur(result)} tone={result >= 0 ? 'green' : 'red'} />
        <Big label="Obračunljive ure" value={`${num(hours)} / ${num(b.billableHours * nMonths)} h`} tone="slate" sub={hours > 0 ? `${eur(result / hours)}/h` : undefined} />
      </div>
      <div className="card"><div className="h2">{label}</div>
        <div className="h-64"><ResponsiveContainer><BarChart data={data}><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={11} /><Tooltip formatter={(v: number) => eur(v)} /><Bar dataKey="v">{data.map((d) => <Cell key={d.name} fill={d.c} />)}</Bar></BarChart></ResponsiveContainer></div>
      </div>
      <div className="card">
        <div className="h2">{isYear ? `Načrt po ceniku (${planN} × mesečni)` : 'Načrt po ceniku (na mesec)'}</div>
        <Row l={`${num(b.billableHours * planN)} h × povprečna postavka ${eur(avgRate)}/h`} v={eur(plan.revenue * planN)} />
        <Row l="− prispevki in administracija" v={eur(plan.fixed * planN)} />
        <Row l={`− ocena davka (${num(b.taxPct)} %)`} v={eur(plan.tax * planN)} />
        <Row l="Predvideni osebni zaslužek" v={eur(plan.result * planN)} strong />
        <Row l="Na uro" v={`${eur(plan.hourly)}/h (cilj ${eur(b.targetHourly)}/h)`} />
        {!plan.ok && <div className="mt-2 text-sm text-orange-600">Pri {num(b.billableHours)} h na mesec cenik ne doseže cilja {eur(b.targetHourly)}/h. Dvigni postavke ali število ur.</div>}
        <p className="mt-2 text-xs text-slate-500">Prodajna cena dela ni čisti zaslužek: odšteti so fiksni stroški in davek. Stroški materiala so pri projektih upoštevani posebej.</p>
      </div>
    </div>
  )
}
