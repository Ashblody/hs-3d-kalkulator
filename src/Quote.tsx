import type { JobInput, Settings } from './types'
import { quoteData } from './quoteData'
import { eur, num } from './format'

/** Ponudba za tisk / "Shrani kot PDF" – prikaže se samo pri tiskanju */
export default function Quote({ job, settings, number }: { job: JobInput; settings: Settings; number: string }) {
  const { r, lines, rights: rt } = quoteData(job, settings)
  const rights = [rt]
  return (
    <div className="text-black bg-white p-8 text-sm font-sans">
      <div className="flex justify-between items-start border-b-4 border-emerald-600 pb-4">
        <div><div className="text-3xl font-black"><span className="text-orange-500">HS</span> 3D</div><div className="text-slate-500">3D-tisk · 3D-skeniranje · CAD-modeliranje</div></div>
        <div className="text-right"><div className="text-xl font-bold">PONUDBA</div><div>št. {number}</div><div>Datum: {new Date(job.date).toLocaleDateString('sl-SI')}</div><div>Veljavnost: 15 dni</div></div>
      </div>
      <div className="mt-4"><div className="text-slate-500 text-xs uppercase">Naročnik</div><div className="font-semibold">{job.client || '—'}</div></div>
      <div className="mt-3"><div className="text-slate-500 text-xs uppercase">Projekt</div><div className="font-semibold">{job.name}</div>{job.description && <div>{job.description}</div>}</div>
      <table className="w-full mt-6 border-collapse">
        <thead><tr className="bg-slate-100 text-left"><th className="p-2">Postavka</th><th className="p-2">Obseg</th><th className="p-2 text-right">Znesek</th></tr></thead>
        <tbody>{lines.map(([l, d, v], i) => <tr key={i} className="border-b border-slate-200"><td className="p-2">{l}</td><td className="p-2 text-slate-600">{d}</td><td className="p-2 text-right tabular-nums">{eur(v)}</td></tr>)}</tbody>
      </table>
      <div className="mt-4 ml-auto w-72">
        {r.minOrderApplied && <div className="flex justify-between"><span>Minimalno naročilo</span><span>{eur(settings.rates.minOrder)}</span></div>}
        {r.rounding > 0.004 && <div className="flex justify-between"><span>Zaokroženo</span><span>{eur(r.rounding)}</span></div>}
        <div className="flex justify-between"><span>Skupaj brez DDV</span><span>{eur(r.net)}</span></div>
        {settings.business.vatEnabled && <div className="flex justify-between"><span>DDV {num(settings.business.vatPct)} %</span><span>{eur(r.vat)}</span></div>}
        <div className="flex justify-between text-lg font-bold border-t-2 border-black mt-1 pt-1"><span>ZA PLAČILO</span><span>{eur(r.gross)}</span></div>
        <div className="text-xs text-slate-500 text-right">{eur(r.perPiece)} na kos</div>
      </div>
      {!settings.business.vatEnabled && <p className="mt-6 text-xs">DDV ni obračunan na podlagi 1. odstavka 94. člena ZDDV-1.</p>}
      {rights.length > 0 && <p className="mt-2 text-xs">Digitalne pravice: {rights.join(', ')}.</p>}
    </div>
  )
}
