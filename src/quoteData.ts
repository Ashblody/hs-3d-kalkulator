import type { Customer, JobInput, Settings } from './types'
import { calculate, effSettings, fileSaleInfo } from './calc'
import { eur, num } from './format'

export type QuoteLine = [string, string, number]
/** Postavke ponudbe – skupno za prikaz, PDF in Excel */
export function quoteData(job: JobInput, settings0: Settings, customer?: Customer) {
  const settings = effSettings(job, settings0)
  const r = calculate(job, settings)
  const mat = settings.materials.find((m) => m.id === job.materialId)
  const lines: QuoteLine[] = []
  const disc = r.invoiceMult
  if (r.printSale > 0) lines.push([`3D-tisk – ${job.pieces} kos, ${mat?.name ?? ''}`, `${num(r.printHours)} h tiska`, r.printSale * disc])
  const sv: [string, number, number][] = [
    ['3D-skeniranje', job.scanH, settings.rates.labourHourly], ['Urejanje skena', job.editH, settings.rates.labourHourly],
    ['CAD-modeliranje', job.cadH, settings.rates.labourHourly], ['Reverse engineering', job.reverseH, settings.rates.labourHourly],
    ['Priprava tiska', job.prepH, settings.rates.labourHourly], ['Dodelava', job.finishH, settings.rates.labourHourly],
    ['Dodatno delo', job.extraWorkH, job.extraWorkRate],
  ]
  const fs = fileSaleInfo(job, settings)
  for (const [l, h, rate] of sv) if (h > 0) lines.push([l, `${num(h)} h × ${eur(rate * disc)}`, h * rate * disc])
  if (job.fileSale?.kind && job.fileSale.kind !== 'none') lines.push([job.fileSale.kind === 'stl' ? 'Datoteka STL (urejen sken)' : 'Datoteka STEP (parametrični CAD)', 'zraven tiska', fs.price * disc])
  if (r.transport > 0) lines.push(['Prevoz', `${num(job.km)} km`, r.transport * disc])
  if (r.packaging > 0) lines.push(['Pakiranje', '', r.packaging * disc])
  if (r.delivery > 0) lines.push(['Dostava', '', r.delivery * disc])
  if (r.otherCosts > 0) lines.push(['Ostalo', '', r.otherCosts * disc])
  if (r.discount > 0) lines.push(['Popust', '', -r.discount])
  const totals: [string, number][] = []
  if (r.minOrderApplied) totals.push(['Minimalno naročilo', settings.rates.minOrder])
  if (r.rounding > 0.004) totals.push(['Zaokroženo', r.rounding])
  totals.push(['Skupaj brez DDV', r.net])
  if (settings.business.vatEnabled) totals.push([`DDV ${num(settings.business.vatPct)} %`, r.vat])
  const rights = job.fileSale?.kind === 'stl' ? 'datoteka STL za osebno uporabo naročnika' : job.fileSale?.kind === 'step' ? 'datoteka STEP za osebno uporabo naročnika' : 'samo fizični izdelek, brez digitalnih datotek'
  return { r, lines, totals, rights, customer, modeLabel: job.mode === 'poslovno' ? 'Poslovno' : 'Osebno' }
}
export const quoteNumber = (job: JobInput, id: string) => `${job.date.replace(/-/g, '')}-${id.slice(0, 4).toUpperCase()}`
export const safeName = (s: string) => (s || 'projekt').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '_').slice(0, 40)
