import type { Customer, JobInput, Settings } from './types'
import { quoteData, quoteNumber, safeName } from './quoteData'

const eurPdf = (x: number) => new Intl.NumberFormat('sl-SI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(x).replace(/\u00a0|\u202f/g, ' ') + ' €'
const b64 = (buf: ArrayBuffer) => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s) }

/** Shrani datoteko: na telefonu Deli (Google Drive …), sicer prenos */
export async function saveFile(blob: Blob, name: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], name, { type: blob.type })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
  if (mobile && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title: name }); return 'shared' } catch (e) { if ((e as Error).name === 'AbortError') return 'cancelled' }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  return 'downloaded'
}

export async function buildPdf(job: JobInput, settings: Settings, id: string, customer?: Customer): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const base = import.meta.env.BASE_URL
  const [reg, bold] = await Promise.all(['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf'].map((f) => fetch(`${base}fonts/${f}`).then((r) => r.arrayBuffer())))
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.addFileToVFS('DV.ttf', b64(reg)); doc.addFont('DV.ttf', 'DV', 'normal')
  doc.addFileToVFS('DVB.ttf', b64(bold)); doc.addFont('DVB.ttf', 'DV', 'bold')
  const { r, lines, totals, rights, modeLabel } = quoteData(job, settings)
  const L = 18, R = 192
  doc.setFont('DV', 'bold'); doc.setFontSize(24); doc.setTextColor(249, 115, 22); doc.text('HS', L, 24)
  doc.setTextColor(15, 23, 42); doc.text('3D', L + 15, 24)
  doc.setFont('DV', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.text('3D-tisk · 3D-skeniranje · CAD-modeliranje', L, 30)
  doc.setTextColor(15, 23, 42); doc.setFont('DV', 'bold'); doc.setFontSize(15); doc.text('PONUDBA', R, 20, { align: 'right' })
  doc.setFont('DV', 'normal'); doc.setFontSize(9)
  doc.text([`št. ${quoteNumber(job, id)}`, `Datum: ${new Date(job.date).toLocaleDateString('sl-SI')}`, 'Veljavnost: 15 dni'], R, 26, { align: 'right' })
  doc.setDrawColor(5, 150, 105); doc.setLineWidth(1.2); doc.line(L, 38, R, 38)
  let y = 47
  const label = (t: string) => { doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text(t.toUpperCase(), L, y); y += 5; doc.setTextColor(15, 23, 42); doc.setFontSize(11) }
  label('Naročnik'); doc.setFont('DV', 'bold'); doc.text(customer?.name || job.client || '—', L, y); y += 5
  doc.setFont('DV', 'normal'); doc.setFontSize(9)
  const contact = [customer?.phone, customer?.email].filter(Boolean).join(' · ')
  if (contact) { doc.text(contact, L, y); y += 5 }
  y += 3
  doc.setFont('DV', 'normal'); label('Projekt'); doc.setFont('DV', 'bold'); doc.text(job.name || '(brez imena)', L, y); y += 5
  doc.setFont('DV', 'normal'); doc.setFontSize(9)
  if (job.description) { const d = doc.splitTextToSize(job.description, R - L); doc.text(d, L, y); y += d.length * 4.5 }
  y += 5
  doc.setFillColor(241, 245, 249); doc.rect(L, y - 5, R - L, 8, 'F'); doc.setFont('DV', 'bold')
  doc.text('Postavka', L + 2, y); doc.text('Obseg', 110, y); doc.text('Znesek', R - 2, y, { align: 'right' }); y += 8
  doc.setFont('DV', 'normal')
  for (const [l, d, v] of lines) {
    if (y > 260) { doc.addPage(); y = 20 }
    const wl = doc.splitTextToSize(l, 88)
    doc.setTextColor(15, 23, 42); doc.text(wl, L + 2, y); doc.setTextColor(71, 85, 105); doc.text(d, 110, y); doc.setTextColor(15, 23, 42); doc.text(eurPdf(v), R - 2, y, { align: 'right' })
    y += wl.length * 4.5 + 1.5; doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.line(L, y - 3.5, R, y - 3.5); y += 2
  }
  y += 4
  for (const [l, v] of totals) { doc.text(l, 120, y); doc.text(eurPdf(v), R - 2, y, { align: 'right' }); y += 5.5 }
  doc.setDrawColor(15, 23, 42); doc.setLineWidth(0.6); doc.line(120, y - 3, R, y - 3); y += 3
  doc.setFont('DV', 'bold'); doc.setFontSize(13); doc.text('ZA PLAČILO', 120, y); doc.text(eurPdf(r.gross), R - 2, y, { align: 'right' }); y += 5
  doc.setFont('DV', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.text(`${eurPdf(r.perPiece)} na kos · ${modeLabel}`, R - 2, y, { align: 'right' }); y += 12
  doc.setTextColor(15, 23, 42)
  if (!settings.business.vatEnabled) { doc.text('DDV ni obračunan na podlagi 1. odstavka 94. člena ZDDV-1.', L, y); y += 5 }
  doc.text(`Digitalne pravice: ${rights}.`, L, y)
  return doc.output('blob')
}

export async function buildXlsx(job: JobInput, settings: Settings, id: string, customer?: Customer): Promise<Blob> {
  const XLSX = await import('xlsx')
  const { r, lines, totals, rights, modeLabel } = quoteData(job, settings)
  const r2 = (x: number) => Math.round(x * 100) / 100
  const ponudba: (string | number)[][] = [
    ['HS 3D – ponudba', quoteNumber(job, id)], ['Datum', job.date], ['Naročnik', customer?.name || job.client || ''], ['Kontakt', [customer?.phone, customer?.email].filter(Boolean).join(' · ')], ['Projekt', job.name], ['Opis', job.description || ''], ['Način', modeLabel], [],
    ['Postavka', 'Obseg', 'Znesek €'], ...lines.map(([l, d, v]) => [l, d, r2(v)]), [],
    ...totals.map(([l, v]) => [l, '', r2(v)]), ['ZA PLAČILO', '', r2(r.gross)], ['Na kos', '', r2(r.perPiece)], [], ['Digitalne pravice', rights],
  ]
  const ph = r.printHours * settings.rates.printHourly
  const razclenitev: (string | number)[][] = [['Postavka', 'Znesek €'],
    ['CENA ZA STRANKO', ''],
    [`Tisk ${r2(r.printHours)} h × ${settings.rates.printHourly} €/h`, r2(r.printSale - (r.printOverridden ? (job.printCostOverride ?? 0) : r.material + r.consumables + r.otherDirect + r.adhesive))],
    [`Material ${r2(r.kg * 1000)} g`, r2(r.printOverridden ? (job.printCostOverride ?? 0) : r.material)],
    ...(r.adhesive > 0 && !r.printOverridden ? [[`Lepilo (${r.adhesiveLabel})`, r2(r.adhesive)] as [string, number]] : []),
    ['Potrošni material', r2(r.printOverridden ? 0 : r.consumables + r.otherDirect)],
    [`Moje delo ${r2(r.laborHours)} h × ${settings.rates.labourHourly} €/h`, r2(r.servicesStandard)],
    ['Datoteka', r2(r.digital)], ['Prevoz in ostali stroški', r2(r.transport + r.packaging + r.delivery + r.otherCosts)],
    ...(r.invoiceMult !== 1 ? [[`Poslovno × ${r.invoiceMult}`, r2(r.invoiceExtra)]] : []), ...(r.discount > 0 ? [['Popust', -r2(r.discount)]] : []),
    ['Skupaj', r2(r.netBeforeRounding)], [`Zaokroženo navzgor (${settings.rates.roundTo || 'brez'} €)`, r2(r.rounding)], ['Končna cena (brez DDV)', r2(r.net)], ['Za plačilo', r2(r.gross)], [],
    ['MOJ STROŠEK – SAMO ZAME (ni v ceni)', ''],
    ['Material', r2(r.material)], ['Elektrika', r2(r.electricity)], ['Obraba tiskalnika', r2(r.wear)], ...(r.adhesive > 0 ? [[`Lepilo (${r.adhesiveLabel})`, r2(r.adhesive)] as [string, number]] : []), ['Potrošni material', r2(r.consumables + r.otherDirect)], ['Rezerva', r2(r.reserve)],
    ['Prevoz, pakiranje, dostava, ostalo', r2(r.realCosts - r.printCost)], ['Moj strošek skupaj', r2(r.realCosts)], [],
    ['Dobiček (končna cena − moj strošek)', r2(r.profit)], ['Delež fiksnih stroškov', r2(r.fixedShare)], ['Ocena davka', r2(r.tax)], ['Predvideni zaslužek', r2(r.earnings)],
    [`Ur tiska (${r2(ph)} € po urni postavki)`, r2(r.printHours)], ['Ur dela', r2(r.laborHours)]]
  const wb = XLSX.utils.book_new()
  const ws1 = XLSX.utils.aoa_to_sheet(ponudba); ws1['!cols'] = [{ wch: 36 }, { wch: 26 }, { wch: 12 }]
  const ws2 = XLSX.utils.aoa_to_sheet(razclenitev); ws2['!cols'] = [{ wch: 40 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'Ponudba'); XLSX.utils.book_append_sheet(wb, ws2, 'Razčlenitev')
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export const pdfName = (job: JobInput) => `HS3D_ponudba_${safeName(job.name)}_${job.date}.pdf`
export const xlsxName = (job: JobInput) => `HS3D_${safeName(job.name)}_${job.date}.xlsx`
