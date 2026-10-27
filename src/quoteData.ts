import type { Customer, JobInput, Settings } from './types'
import { calculate, effSettings, fileSaleInfo, isPrinting } from './calc'
import { eur, num } from './format'

export type QuoteLine = [string, string, number]
/** Postavke ponudbe – skupno za prikaz, PDF in Excel */
export function quoteData(job: JobInput, settings0: Settings, customer?: Customer) {
  const settings = effSettings(job, settings0)
  const r = calculate(job, settings)
  const mat = settings.materials.find((m) => m.id === job.materialId)
  const lines: QuoteLine[] = []
  const disc = r.invoiceMult
  const printing = isPrinting(job)
  if (printing && r.printSale > 0) lines.push([`3D-tisk – ${job.pieces} kos, ${mat?.name ?? ''}`, `${num(r.printHours)} h tiska`, r.printSale * disc])
  const sv: [string, number, number][] = [
    ['3D-skeniranje', job.scanH, settings.rates.labourHourly], ['Urejanje skena', job.editH, settings.rates.labourHourly],
    ['Modeliranje / CAD / reverse engineering', (job.cadH || 0) + (job.reverseH || 0), settings.rates.labourHourly],
    [printing ? 'Priprava tiska in dodelava' : 'Priprava in dodelava', (job.prepH || 0) + (job.finishH || 0), settings.rates.labourHourly],
    ['Drugo delo', job.extraWorkH, job.extraWorkRate],
  ]
  const fs = fileSaleInfo(job, settings)
  for (const [l, h, rate] of sv) if (h > 0) lines.push([l, `${num(h)} h × ${eur(rate * disc)}`, h * rate * disc])
  if (job.fileSale?.kind && job.fileSale.kind !== 'none') lines.push([job.fileSale.kind === 'stl' ? 'Datoteka STL (urejen sken)' : 'Datoteka STEP (parametrični CAD)', printing ? 'zraven tiska' : '', fs.price * disc])
  if (r.transport > 0) lines.push(['Prevoz', `${num(job.km)} km`, r.transport * disc])
  const oth = r.packaging + r.delivery + r.otherCosts
  if (oth > 0) lines.push(['Ostali stroški', '', oth * disc])
  if (r.discount > 0) lines.push(['Popust', '', -r.discount])
  const totals: [string, number][] = []
  if (r.minOrderApplied) totals.push(['Minimalno naročilo', settings.rates.minOrder])
  if (r.rounding > 0.004) totals.push(['Zaokroženo', r.rounding])
  totals.push(['Skupaj brez DDV', r.net])
  if (settings.business.vatEnabled) totals.push([`DDV ${num(settings.business.vatPct)} %`, r.vat])
  const rights = job.fileSale?.kind === 'stl' ? 'datoteka STL za osebno uporabo naročnika' : job.fileSale?.kind === 'step' ? 'datoteka STEP za osebno uporabo naročnika' : printing ? 'samo fizični izdelek, brez digitalnih datotek' : 'samo storitev, brez digitalnih datotek'
  return { r, lines, totals, rights, customer, modeLabel: job.mode === 'poslovno' ? 'Poslovno' : 'Osebno' }
}
export const quoteNumber = (job: JobInput, id: string) => `${job.date.replace(/-/g, '')}-${id.slice(0, 4).toUpperCase()}`
export const safeName = (s: string) => (s || 'projekt').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '_').slice(0, 40)
