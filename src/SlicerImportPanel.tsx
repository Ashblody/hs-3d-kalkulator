import { useState } from 'react'
import type { Material, Plate } from './types'
import { readSlicerGcode, type SlicerPreview } from './slicerImport'

export default function SlicerImport({ materials, materialId, onAdd }: { materials: Material[]; materialId: string; onAdd: (p: Plate) => void }) {
  const [preview, setPreview] = useState<SlicerPreview | null>(null)
  const [filename, setFilename] = useState('')
  const [minutes, setMinutes] = useState('')
  const [grams, setGrams] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState(materialId)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const number = (s: string) => Number(s.trim().replace(',', '.'))
  const min = number(minutes), g = number(grams)
  const ready = confirmed && minutes.trim() !== '' && grams.trim() !== '' && Number.isFinite(min) && min > 0 && Number.isFinite(g) && g > 0 && materials.some(m => m.id === selectedMaterial)
  async function load(file: File | undefined) {
    setPreview(null); setError(''); setConfirmed(false); setFilename(file?.name ?? '')
    if (!file) return
    if (!/\.gcode$/i.test(file.name)) { setError('Izberi besedilno datoteko .gcode. Datoteke 3MF in binarne G-kode še niso podprte.'); return }
    if (file.size > 100 * 1024 * 1024) { setError('Datoteka je večja od 100 MB. Podatke vnesi ročno.'); return }
    try {
      const text = await file.text()
      if (text.includes('\0')) { setError('To ni podprta besedilna G-koda.'); return }
      const data = readSlicerGcode(text)
      setMinutes(data.minutes === null ? '' : String(data.minutes))
      setGrams(data.grams === null ? '' : String(data.grams))
      setSelectedMaterial(materialId)
      setPreview(data)
    } catch { setError('Datoteke ni bilo mogoče prebrati. Poskusi znova ali vnesi podatke ročno.') }
  }
  return <details className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-sm">
    <summary className="cursor-pointer font-semibold">Uvoz besedilne G-kode</summary>
    <p className="text-xs text-slate-500 mt-2">Datoteka se prebere na tej napravi. Preveri podatke in jih po potrebi popravi; števila kosov ne spreminjamo.</p>
    <input className="mt-2 block w-full text-sm" type="file" accept=".gcode" aria-label="Izberi G-kodo" onChange={e => { void load(e.target.files?.[0]); e.target.value = '' }} />
    {error && <p role="alert" className="text-red-600 mt-2">{error}</p>}
    {preview && <div className="space-y-2 mt-2">
      <p className="text-xs">{filename} · čas: {preview.timeSource ?? 'ni prebran'} · masa: {preview.weightSource ?? 'ni prebrana'}</p>
      {preview.multipleWeights && <p className="text-amber-700 dark:text-amber-300">Datoteka navaja več porab. Vnesi maso izbranega materiala in druge materiale dodaj ročno k isti plošči. Čas tiska vnesi samo enkrat.</p>}
      <p className="text-xs text-amber-700 dark:text-amber-300">Masa lahko vključuje podpore in odpad pri menjavah. Preveri tudi nastavljeni dodatni odstotek odpada, da ga ne obračunaš dvakrat. Če uporabljaš več materialov, jih vnesi ločeno.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="block"><span className="lbl">Skupni čas plošče (minute)</span><input className="inp" inputMode="decimal" value={minutes} onChange={e => setMinutes(e.target.value)} /></label>
        <label className="block"><span className="lbl">Masa izbranega materiala (g)</span><input className="inp" inputMode="decimal" value={grams} onChange={e => setGrams(e.target.value)} /></label>
        <label className="block"><span className="lbl">Material</span><select className="inp" value={selectedMaterial} onChange={e => setSelectedMaterial(e.target.value)}>{materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      </div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Preveril sem čas, maso in izbrani material.</label>
      <button type="button" className="btn" disabled={!ready} onClick={() => { onAdd({ hours: Math.floor(min / 60), minutes: min % 60, grams: g, materialId: selectedMaterial }); setPreview(null) }}>Dodaj kot novo ploščo</button>
    </div>}
  </details>
}
