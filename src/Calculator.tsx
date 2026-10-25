import type { DigitalKind, JobInput, Mode, OrderType, Settings } from './types'
import { calculate, fileSaleInfo, markupToMargin, pricePerKg, validateJob, wearPerHour, powerFor } from './calc'
import { eur, num } from './format'
import { digitalLabels } from './seed'
import { Big, Check, NumField, Row, Section, Select, TextField } from './ui'
import { PriceVsCost, StructurePie } from './Charts'

const modes: [Mode, string][] = [['stranka', 'Stranka'], ['prijatelj', 'Prijatelj'], ['zase', 'Zase']]
const types: [OrderType, string][] = [['tisk', 'Samo tisk'], ['sken', 'Skeniranje'], ['cad', 'CAD'], ['kombinirano', 'Kombinirano'], ['digitalno', 'Digitalna datoteka']]

export default function Calculator({ job, settings, onChange, actions }: { job: JobInput; settings: Settings; onChange: (j: JobInput) => void; actions?: React.ReactNode }) {
  const set = <K extends keyof JobInput>(k: K) => (v: JobInput[K]) => onChange({ ...job, [k]: v })
  const setDig = (k: DigitalKind, patch: Partial<JobInput['digital'][DigitalKind]>) => onChange({ ...job, digital: { ...job.digital, [k]: { ...job.digital[k], ...patch } } })
  const r = calculate(job, settings)
  const errors = validateJob(job)
  const printer = settings.printers.find((p) => p.id === job.printerId)
  const mat = settings.materials.find((m) => m.id === job.materialId)
  const zase = job.mode === 'zase'
  const showPrint = job.orderType !== 'digitalno' || true
  const showDigital = job.orderType === 'digitalno' || Object.values(job.digital).some((d) => d.on)

  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-4">
      <div className="space-y-4 min-w-0">
        <div className="card">
          <div className="flex flex-wrap gap-2 mb-3">
            {modes.map(([m, l]) => (
              <button key={m} onClick={() => set('mode')(m)} className={`flex-1 rounded-xl px-3 py-2 font-semibold text-sm ${job.mode === m ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>{l}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <TextField label="Ime projekta" value={job.name} onChange={set('name')} />
            <TextField label="Stranka" value={job.client} onChange={set('client')} />
            <TextField label="Datum" type="date" value={job.date} onChange={set('date')} />
            <Select label="Vrsta naročila" value={job.orderType} onChange={set('orderType')} options={types} />
            <div className="col-span-2"><TextField label="Opis" value={job.description} onChange={set('description')} /></div>
          </div>
        </div>

        {showPrint && (
          <Section title="3D-tiskanje">
            <Select label="Tiskalnik" value={job.printerId} onChange={set('printerId')} options={settings.printers.map((p) => [p.id, p.name])} />
            <Select label="Material" value={job.materialId} onChange={set('materialId')} options={settings.materials.map((m) => [m.id, `${m.name} (${num(pricePerKg(m))} €/kg)`])} />
            <NumField label="Število kosov" value={job.pieces} onChange={(v) => set('pieces')(Math.max(1, Math.round(v)))} min={1} />
            <NumField label="Teža kosa" value={job.gramsPerPiece} onChange={set('gramsPerPiece')} suffix="g" />
            <div className="col-span-2 sm:col-span-3"><Check label="Vnesem skupen čas tiska za celo serijo" checked={job.useBatchTime} onChange={set('useBatchTime')} /></div>
            {job.useBatchTime ? (<>
              <NumField label="Skupen čas – ure" value={job.batchHours} onChange={set('batchHours')} suffix="h" />
              <NumField label="Skupen čas – minute" value={job.batchMinutes} onChange={set('batchMinutes')} suffix="min" />
            </>) : (<>
              <NumField label="Čas kosa – ure" value={job.hoursPerPiece} onChange={set('hoursPerPiece')} suffix="h" />
              <NumField label="Čas kosa – minute" value={job.minutesPerPiece} onChange={set('minutesPerPiece')} suffix="min" />
            </>)}
            <NumField label="Dodatna poraba (podpore, purge, AMS)" value={job.extraMaterialG} onChange={set('extraMaterialG')} suffix="g" />
            <NumField label="Potrošni material (lepilo …)" value={job.consumables} onChange={set('consumables')} suffix="€" />
            <NumField label="Rezerva za neuspele tiske" value={job.reservePct} onChange={set('reservePct')} suffix="%" />
            {job.mode === 'stranka' && <NumField label="Pribitek na stroške tiska" value={job.markupPct} onChange={set('markupPct')} suffix="%" />}
            <div className="col-span-2 sm:col-span-3 text-xs text-slate-500 dark:text-slate-400">
              Čas skupaj {num(r.printHours)} h · filament {num(r.kg * 1000)} g · moč {num(r.powerW)} W{printer && !r.powerW ? ' (vnesi moč v Nastavitvah)' : ''} · amortizacija {printer ? num(wearPerHour(printer)) : 0} €/h
              {job.mode === 'stranka' && ` · pribitek ${num(job.markupPct)} % = marža ${num(markupToMargin(job.markupPct))} %`}
              {job.mode === 'prijatelj' && ` · Prijatelj: stroški + ${num(settings.rates.friendPrintHourly)} € na uro tiskanja (brez % pribitka)`}
              {zase && ' · Zase: tisk po stroških, brez pribitka'}
              {mat && printer && powerFor(printer, mat.type) === 0 && <span className="text-orange-600"> · Za {mat.type} na tem tiskalniku moč ni vnesena.</span>}
            </div>
          </Section>
        )}

        <Section title="Storitve (ure, 0 = ne obračunam)" open={job.orderType !== 'tisk'}>
          <NumField label={`Skeniranje na terenu (${num(settings.rates.scan)} €/h)`} value={job.scanH} onChange={set('scanH')} suffix="h" />
          <NumField label={`Urejanje skena (${num(settings.rates.edit)} €/h)`} value={job.editH} onChange={set('editH')} suffix="h" />
          <NumField label={`CAD-modeliranje (${num(settings.rates.cad)} €/h)`} value={job.cadH} onChange={set('cadH')} suffix="h" />
          <NumField label={`Reverse engineering (${num(settings.rates.reverse)} €/h)`} value={job.reverseH} onChange={set('reverseH')} suffix="h" />
          <NumField label={`Priprava tiska (${num(settings.rates.prep)} €/h)`} value={job.prepH} onChange={set('prepH')} suffix="h" />
          <NumField label={`Dodelava / podpore (${num(settings.rates.prep)} €/h)`} value={job.finishH} onChange={set('finishH')} suffix="h" />
          <NumField label="Dodatno delo" value={job.extraWorkH} onChange={set('extraWorkH')} suffix="h" />
          <NumField label="Dodatno delo – cena" value={job.extraWorkRate} onChange={set('extraWorkRate')} suffix="€/h" />
          {job.mode === 'prijatelj' && <NumField label="Prijateljski popust na storitve" value={job.friendDiscountPct} onChange={set('friendDiscountPct')} suffix="%" />}
        </Section>

        <details className="card" open={showDigital}>
          <summary className="cursor-pointer select-none font-semibold text-slate-800 dark:text-slate-100">Prodaja digitalnih datotek</summary>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl bg-sky-50 dark:bg-sky-900/20 p-3 space-y-2">
              <div className="font-semibold text-sm">Samodejna cena datoteke iz ur storitev</div>
              <div className="flex gap-2">{([['none', 'Brez'], ['stl', 'STL (urejen sken)'], ['step', 'STEP (parametrični)']] as const).map(([v, l]) => (
                <button key={v} onClick={() => onChange({ ...job, fileSale: { ...job.fileSale, kind: v } })} className={`flex-1 rounded-xl px-2 py-1.5 text-sm font-semibold ${job.fileSale.kind === v ? 'bg-sky-600 text-white' : 'bg-white dark:bg-slate-800'}`}>{l}</button>))}</div>
              {job.fileSale.kind !== 'none' && <>
                <div className="flex gap-2">{([['zDelom', 'Z naročilom (storitve že obračunane)'], ['samostojno', 'Samostojna prodaja'], ['ponovna', `Ponovna prodaja (${num(settings.rates.repeatSalePct)} %)`]] as const).map(([v, l]) => (
                  <button key={v} onClick={() => onChange({ ...job, fileSale: { ...job.fileSale, context: v } })} className={`flex-1 rounded-xl px-2 py-1.5 text-xs font-semibold ${job.fileSale.context === v ? 'bg-slate-700 text-white' : 'bg-white dark:bg-slate-800'}`}>{l}</button>))}</div>
                {(() => { const f = fileSaleInfo(job, settings); const t = zase ? 0 : job.mode === 'prijatelj' ? 1 - job.friendDiscountPct / 100 : 1; return <p className="text-xs text-slate-600 dark:text-slate-300">
                  STL = sken {num(job.scanH)} h × {num(settings.rates.scan)} € + urejanje {num(job.editH)} h × {num(settings.rates.edit)} € = {eur(f.stl)} · STEP = STL + CAD {num(job.cadH)} h × {num(settings.rates.cad)} € + zahtevni CAD {num(job.reverseH)} h × {num(settings.rates.reverse)} € = {eur(f.step)}<br />
                  {job.fileSale.context === 'zDelom' ? `Storitve so že v tem projektu – datoteka brez dvojnega obračuna (predaja ${eur(settings.rates.fileHandoverFee)}).` : job.fileSale.context === 'ponovna' ? `Ponovna prodaja: ${num(settings.rates.repeatSalePct)} % od ${eur(f.original)}; ure se ne obračunajo kot storitve.` : 'Samostojno: ure skena/CAD so v ceni datoteke, ne še enkrat kot storitve.'}
                  {' '}Predlog: <b>{eur(f.suggested * t)}</b>{job.mode === 'prijatelj' && ' (s prijateljskim popustom)'}{zase && ' (Zase: 0)'}</p> })()}
                <Check label="Ročno prepiši ceno datoteke" checked={job.fileSale.override !== null} onChange={(on) => onChange({ ...job, fileSale: { ...job.fileSale, override: on ? Math.round(fileSaleInfo(job, settings).suggested * 100) / 100 : null } })} />
                {job.fileSale.override !== null && <NumField label="Cena datoteke (pred popustom stopnje)" value={job.fileSale.override} onChange={(v) => onChange({ ...job, fileSale: { ...job.fileSale, override: v } })} suffix="€" />}
              </>}
            </div>
            {(Object.keys(digitalLabels) as DigitalKind[]).map((k) => {
              const d = job.digital[k]
              return (
                <div key={k} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                  <div className="flex justify-between items-center"><Check label={digitalLabels[k]} checked={d.on} onChange={(on) => setDig(k, { on })} />{d.on && <span className="text-sm font-semibold text-emerald-600">{eur(d.hours * d.rate + d.extra)}</span>}</div>
                  {d.on && <div className="grid grid-cols-3 gap-2 mt-2">
                    <NumField label="Čas" value={d.hours} onChange={(hours) => setDig(k, { hours })} suffix="h" />
                    <NumField label="Postavka" value={d.rate} onChange={(rate) => setDig(k, { rate })} suffix="€/h" />
                    <NumField label="Dodatni stroški" value={d.extra} onChange={(extra) => setDig(k, { extra })} suffix="€" />
                  </div>}
                </div>
              )
            })}
            <div className="grid sm:grid-cols-2">
              <Check label="Samo fizični izdelek, brez datotek" checked={job.rights.physicalOnly} onChange={(v) => onChange({ ...job, rights: { ...job.rights, physicalOnly: v } })} />
              <Check label="Datoteka za osebno uporabo naročnika" checked={job.rights.personalUse} onChange={(v) => onChange({ ...job, rights: { ...job.rights, personalUse: v, physicalOnly: v ? false : job.rights.physicalOnly } })} />
              <Check label="Pravica do komercialne uporabe" checked={job.rights.commercial} onChange={(v) => onChange({ ...job, rights: { ...job.rights, commercial: v, physicalOnly: v ? false : job.rights.physicalOnly } })} />
              <Check label="Prenos izvorne CAD-datoteke" checked={job.rights.sourceCad} onChange={(v) => onChange({ ...job, rights: { ...job.rights, sourceCad: v, physicalOnly: v ? false : job.rights.physicalOnly } })} />
            </div>
            <p className="text-xs text-slate-500">Izvoz STEP iz že narejenega CAD in rekonstrukcija STEP iz skena imata ločeni postavki. Pravice vplivajo na ceno le prek časa in dodatnih stroškov, ki jih vneseš.</p>
          </div>
        </details>

        <Section title="Ostalo" open={false}>
          <NumField label={`Prevoz (${num(settings.rates.km)} €/km)`} value={job.km} onChange={set('km')} suffix="km" />
          <NumField label="Pakiranje" value={job.packaging} onChange={set('packaging')} suffix="€" />
          <NumField label="Dostava" value={job.delivery} onChange={set('delivery')} suffix="€" />
          <NumField label="Ostali stroški" value={job.otherCosts} onChange={set('otherCosts')} suffix="€" />
          <NumField label="Ostali neposredni stroški tiska" value={job.otherDirect} onChange={set('otherDirect')} suffix="€" />
          <NumField label="Popust" value={job.discount} onChange={set('discount')} suffix="€" />
          <div className="col-span-2 sm:col-span-3">
            <Check label="Ročno določim stroške tiska" checked={job.printCostOverride !== null} onChange={(v) => set('printCostOverride')(v ? Math.round(r.printCost * 100) / 100 : null)} />
            {job.printCostOverride !== null && <NumField label="Stroški tiska (ročno)" value={job.printCostOverride} onChange={(v) => set('printCostOverride')(v)} suffix="€" />}
          </div>
        </Section>
      </div>

      <div className="space-y-4 lg:sticky lg:top-4 self-start">
        {errors.length > 0 && <div className="card !ring-red-400 text-sm text-red-600">{errors.map((e) => <div key={e}>{e}</div>)}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Big label={zase ? 'Dejanski stroški' : 'Končna cena'} tone="green" value={eur(r.gross)} sub={zase ? 'Zase: brez prodajne cene' : settings.business.vatEnabled ? `brez DDV ${eur(r.net)} · DDV ${eur(r.vat)}` : 'DDV ni obračunan (mali davčni zavezanec)'} /></div>
          <Big label="Cena na kos" value={eur(r.perPiece)} />
          <Big label="Stroški tiskanja" value={eur(r.printCost)} tone="slate" sub={r.printOverridden ? 'ročno določeno' : `${num(r.printHours)} h tiska`} />
          <Big label={zase ? 'Vrednost mojega časa' : 'Vrednost storitev'} value={eur(zase ? r.timeValue : r.services + r.digital)} tone="slate" sub={zase ? 'informativno, ni v ceni' : `${num(r.laborHours)} h dela`} />
          <Big label="Predvideni zaslužek" tone={r.belowTarget ? 'red' : 'green'} value={eur(r.earnings)} sub={r.laborHours > 0 && !zase ? `${eur(r.earningsPerHour)}/h dela` : undefined} />
        </div>
        {r.belowTarget && <div className="card !ring-orange-400 text-sm text-orange-700 dark:text-orange-300">Zaslužek {eur(r.earningsPerHour)}/h je pod ciljem {eur(settings.business.targetHourly)}/h. Dvigni postavke ali pribitek.</div>}
        {r.minOrderApplied && <div className="card text-sm text-sky-700 dark:text-sky-300">Upoštevano minimalno naročilo {eur(settings.rates.minOrder)}.</div>}

        <div className="card">
          <div className="h2">Razčlenitev</div>
          <div className="text-xs font-semibold text-slate-400 mt-1">1. Stroški tiskanja</div>
          <Row l={`Material (${num(r.kg * 1000)} g)`} v={eur(r.material)} />
          <Row l="Elektrika" v={eur(r.electricity)} />
          <Row l="Amortizacija tiskalnika" v={eur(r.wear)} />
          <Row l="Potrošni + ostali neposredni" v={eur(r.consumables + r.otherDirect)} />
          <Row l={`Rezerva ${num(job.reservePct)} %`} v={eur(r.reserve)} />
          <Row l="Stroški tiskanja" v={eur(r.printCost)} strong />
          {job.mode === 'stranka' && <Row l={`Pribitek ${num(job.markupPct)} % (marža ${num(r.printMarginPct)} %)`} v={eur(r.markup)} />}
          {job.mode === 'prijatelj' && <Row l={`Prijatelj: ${num(r.printHours)} h × ${num(settings.rates.friendPrintHourly)} €/h tiska`} v={eur(r.markup)} />}
          <Row l="Prodajna cena tiska" v={eur(r.printSale)} />
          <div className="text-xs font-semibold text-slate-400 mt-3">2. Prodajna vrednost dela</div>
          <Row l="Storitve po ceniku" v={eur(r.servicesStandard)} />
          {r.servicesDiscount > 0 && <Row l={zase ? 'Zase – ni obračunano' : 'Prijateljski popust'} v={`−${eur(r.servicesDiscount)}`} />}
          {r.digital > 0 && <Row l="Digitalne datoteke" v={eur(r.digital)} />}
          <Row l="Prevoz, pakiranje, dostava, ostalo" v={eur(r.transport + r.packaging + r.delivery + r.otherCosts)} />
          {r.discount > 0 && <Row l="Popust" v={`−${eur(r.discount)}`} />}
          <Row l="Prihodek (brez DDV)" v={eur(r.net)} strong />
          <div className="text-xs font-semibold text-slate-400 mt-3">3.–5. Od prihodka do zaslužka</div>
          <Row l="− dejanski stroški" v={eur(r.realCosts)} />
          <Row l="− delež fiksnih stroškov dejavnosti" v={eur(r.fixedShare)} />
          <Row l={`− ocena davka (${num(settings.business.taxPct)} %)`} v={eur(r.tax)} />
          <Row l="Predvideni osebni zaslužek" v={eur(r.earnings)} strong />
        </div>

        <div className="card"><div className="h2">Struktura cene</div><StructurePie r={r} /></div>
        <div className="card"><div className="h2">Cena in stroški</div><PriceVsCost r={r} /></div>
        {actions}
      </div>
    </div>
  )
}
