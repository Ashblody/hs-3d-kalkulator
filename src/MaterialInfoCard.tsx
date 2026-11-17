import { materialInfo } from './materialInfo'

/** zložena kartica »Več o materialu« (nič, če material nima kartice) */
export default function MaterialInfoCard({ id, className = '' }: { id: string | undefined; className?: string }) {
  const i = materialInfo(id)
  if (!i) return null
  const list = (t: string, xs: string[]) => <div><div className="font-semibold">{t}</div><ul className="list-disc pl-4">{xs.map((x) => <li key={x}>{x}</li>)}</ul></div>
  const set: [string, string | undefined][] = [['Šoba', i.soba], ['Podlaga', i.podlaga], ['Komora', i.komora], ['Sušenje', i.susenje], ['Kaljena šoba', i.kaljena]]
  return (
    <details className={`text-sm rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 px-3 py-1.5 ${className}`} data-testid="material-info">
      <summary className="cursor-pointer select-none text-sky-700 dark:text-sky-300">ⓘ Več o materialu</summary>
      <div className="grid sm:grid-cols-3 gap-2 mt-2">{list('Uporaba', i.uporaba)}{list('Prednosti', i.prednosti)}{list('Slabosti', i.slabosti)}</div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-1 mt-2">{set.map(([l, v]) => <div key={l}><span className="text-slate-500">{l}:</span> <b>{v ?? '–'}</b></div>)}</div>
      <div className="text-xs text-slate-500 mt-1 break-words">Vir: {i.vir}</div>
    </details>
  )
}
