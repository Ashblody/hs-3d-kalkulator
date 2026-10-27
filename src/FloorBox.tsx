import type { Floor } from './calc'
import { eur } from './format'
import { Row } from './ui'

/** opomnik zame – ne gre v PDF/ponudbo */
export default function FloorBox({ f, biz, rate, printing = true }: { f: Floor; biz: boolean; rate: number; printing?: boolean }) {
  return (
    <div className="mt-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/40 p-3 text-sm" data-testid="floor-box">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Spodnja meja – ne pojdi pod</div>
      <Row l="Pod tem izgubljaš (moj strošek)" v={eur(f.own)} />
      <Row l={`Najnižja cena (delo še plačano ${rate} €/h)`} v={eur(f.floor)} />
      {biz && <Row l="Najnižja – Poslovno ×2" v={eur(f.floorBiz)} />}
      {printing && <>
      <Row l="Varno popuščanje (tisk 2 €/h)" v={eur(f.safe)} />
      {biz && <Row l="Varno – Poslovno ×2" v={eur(f.safeBiz)} />}
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Popuščaj pri tisku, ne pri svojih urah – tiskalnik dela sam.</div></>}
    </div>
  )
}
