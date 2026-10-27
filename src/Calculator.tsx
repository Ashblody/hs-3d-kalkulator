import type { JobInput, Mode, Settings } from './types'
import FloorBox from './FloorBox'
import { allTiers, TIERS, calculate, jobFloor, fileSaleInfo, pricePerKg, validateJob, wearPerHour, powerFor } from './calc'
import { eur, num } from './format'
import { Big, Check, NumField, Row, Section, Select, TextField } from './ui'
import { PriceVsCost, StructurePie } from './Charts'
import { quickCalc, quickDefaults } from './quick'

const modes: [Mode, string, string][] = [['osebno', 'Osebno', 'na roke'], ['poslovno', 'Poslovno', 'z računom']]

export default function Calculator({ job, settings, onChange, actions, customerSlot }: { job: JobInput; settings: Settings; onChange: (j: JobInput) => void; actions?: React.ReactNode; customerSlot?: React.ReactNode }) {
  const set = <K extends keyof JobInput>(k: K) => (v: JobInput[K]) => onChange({ ...job, [k]: v })
  const r = calculate(job, settings)
  const errors = validateJob(job)
  const printer = settings.printers.find((p) => p.id === job.printerId)
  const mat = settings.materials.find((m) => m.id === job.materialId)
  const showPrint = job.orderType !== 'digitalno' || true
  const showDigital = job.orderType === 'digitalno' || job.fileSale.kind !== 'none'

  return (
    <div className="grid lg:grid-cols-[1fr_420px] gap-4">
      <div className="space-y-4 min-w-0">
        <div className="card">
          <div className="flex flex-wrap gap-2 mb-3">
            {modes.map(([m, l, sub]) => (
              <button key={m} onClick={() => set('mode')(m)} className={`flex-1 rounded-xl px-3 py-2 font-semibold text-sm ${job.mode === m ? (m === 'poslovno' ? 'bg-emerald-600 text-white' : 'bg-sky-600 text-white') : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-700'}`}>{l}<span className="block text-xs font-normal opacity-80">{sub}{m === 'poslovno' ? ` (×${num(settings.rates.invoiceMultiplier)})` : ''}</span></button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <TextField label="Ime projekta" value={job.name} onChange={set('name')} />
            {customerSlot}
            <TextField label="Stranka" value={job.client} onChange={set('client')} />
            <TextField label="Datum" type="date" value={job.date} onChange={set('date')} />
            {job.rateOverride && <div className="col-span-2 sm:col-span-3 text-xs text-sky-600 dark:text-sky-300">Cenik stranke: tisk {num(settings.rates.printHourly)} €/h · delo {num(settings.rates.labourHourly)} €/h <button className="underline ml-1" onClick={() => onChange({ ...job, rateOverride: undefined })}>ponastavi</button></div>}
            <div className="col-span-2"><TextField label="Opis" value={job.description} onChange={set('description')} /></div>
          </div>
        </div>

        {showPrint && (
          <Section title="3D-tiskanje">
            <Select label="Tiskalnik" value={job.printerId} onChange={set('printerId')} options={settings.printers.map((p) => [p.id, p.name])} />
            <Select label="Material" value={job.materialId} onChange={set('materialId')} options={settings.materials.map((m) => [m.id, `${m.name} (${num(pricePerKg(m))} €/kg)`])} />
            <NumField label="Število kosov" value={job.pieces} onChange={(v) => set('pieces')(Math.max(1, Math.round(v)))} min={1} />
            <div className="col-span-2 sm:col-span-3"><Check label="Vnos po ploščah iz slicerja (Bambu Studio / PrusaSlicer)" checked={job.usePlates} onChange={(v) => onChange({ ...job, usePlates: v, plates: v && !job.plates.length ? [{ hours: 0, minutes: 0, grams: 0, materialId: job.materialId }] : job.plates })} /></div>
            {job.usePlates ? (
              <div className="col-span-2 sm:col-span-3 space-y-2">
                {job.plates.map((p, i) => {
                  const setP = (patch: Partial<typeof p>) => onChange({ ...job, plates: job.plates.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
                  return (
                    <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end rounded-xl bg-slate-50 dark:bg-slate-800/60 dark:ring-1 dark:ring-slate-700/60 p-2">
                      <div className="text-xs font-semibold self-center">Plošča {i + 1}</div>
                      <NumField label="Ure" value={p.hours} onChange={(v) => setP({ hours: v })} suffix="h" />
                      <NumField label="Minute" value={p.minutes} onChange={(v) => setP({ minutes: v })} suffix="min" />
                      <NumField label="Grami" value={p.grams} onChange={(v) => setP({ grams: v })} suffix="g" />
                      <div className="flex gap-1 items-end"><Select label="Material" value={p.materialId} onChange={(v) => setP({ materialId: v })} options={settings.materials.map((m) => [m.id, m.name])} />
                        <button className="btn !px-2" title="Odstrani ploščo" onClick={() => onChange({ ...job, plates: job.plates.filter((_, k) => k !== i) })}>×</button></div>
                    </div>)
                })}
                <button className="btn" onClick={() => onChange({ ...job, plates: [...job.plates, { hours: 0, minutes: 0, grams: 0, materialId: job.materialId }] })}>+ Dodaj ploščo</button>
                <div className="text-xs text-slate-500">Plošče skupaj: {num(r.printHours)} h · {num(job.plates.reduce((a, p) => a + p.grams, 0))} g (čas in grami celega naročila; število kosov se ne množi)</div>
              </div>
            ) : (<>
            <div className="col-span-2 sm:col-span-3"><Check label="Vnesem skupen čas tiska za celo serijo" checked={job.useBatchTime} onChange={set('useBatchTime')} /></div>
            {job.useBatchTime ? (<>
              <NumField label="Skupen čas – ure" value={job.batchHours} onChange={set('batchHours')} suffix="h" />
              <NumField label="Skupen čas – minute" value={job.batchMinutes} onChange={set('batchMinutes')} suffix="min" />
            </>) : (<>
              <NumField label="Teža kosa" value={job.gramsPerPiece} onChange={set('gramsPerPiece')} suffix="g" />
              <NumField label="Čas kosa – ure" value={job.hoursPerPiece} onChange={set('hoursPerPiece')} suffix="h" />
              <NumField label="Čas kosa – minute" value={job.minutesPerPiece} onChange={set('minutesPerPiece')} suffix="min" />
            </>)}
            </>)}
            {job.extraMaterialG > 0 && <NumField label="Dodatna poraba (stari vnos)" value={job.extraMaterialG} onChange={set('extraMaterialG')} suffix="g" />}
            <NumField label="Potrošni material (drugo)" value={job.consumables} onChange={set('consumables')} suffix="€" />
            <NumField label="Rezerva za neuspele tiske" value={job.reservePct} onChange={set('reservePct')} suffix="%" />
            <div className="col-span-2 sm:col-span-3 text-xs text-slate-500 dark:text-slate-400">
              {r.adhesive > 0 && <span className="text-sky-600 dark:text-sky-300">Lepilo ({r.adhesiveLabel}) {eur(r.adhesive)} se doda samodejno · </span>}
              Teža iz slicerja (skupaj s podporami in purge) · čas skupaj {num(r.printHours)} h · filament {num(r.kg * 1000)} g · moč {num(r.powerW)} W{printer && !r.powerW ? ' (vnesi moč v Nastavitvah)' : ''} · amortizacija {printer ? num(wearPerHour(printer)) : 0} €/h
              {` · tisk ${num(settings.rates.printHourly)} €/h tiskalnika + material po strošku`}
              {mat && printer && powerFor(printer, mat.type) === 0 && <span className="text-orange-600"> · Za {mat.type} na tem tiskalniku moč ni vnesena.</span>}
            </div>
          </Section>
        )}

        <Section title={`Moje delo (${num(settings.rates.labourHourly)} €/h, 0 = ne obračunam)`}>
          <NumField label="Skeniranje" value={job.scanH} onChange={set('scanH')} suffix="h" />
          <NumField label="Urejanje skena" value={job.editH} onChange={set('editH')} suffix="h" />
          <NumField label="Modeliranje / CAD / reverse engineering" value={job.cadH} onChange={set('cadH')} suffix="h" />
          <NumField label="Slicer, priprava in dodelava" value={job.prepH} onChange={set('prepH')} suffix="h" />
        </Section>

        <details className="card" open={showDigital}>
          <summary className="cursor-pointer select-none font-semibold text-slate-800 dark:text-slate-100">Prodaja digitalne datoteke</summary>
          <div className="mt-3 flex gap-2">{([['none', 'Brez'], ['stl', `STL ${eur(settings.rates.fileAddonStl)}`], ['step', `STEP ${eur(settings.rates.fileAddonStep)}`]] as const).map(([v, l]) => (
            <button key={v} onClick={() => onChange({ ...job, fileSale: { kind: v } })} className={`flex-1 rounded-xl px-2 py-2 text-sm font-semibold ${job.fileSale.kind === v ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-700'}`}>{l}</button>))}</div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Cene datotek urejaš v Nastavitvah.</p>
        </details>

        <Section title="Ostalo" open={false}>
          <NumField label={`Prevoz (${num(settings.rates.km)} €/km)`} value={job.km} onChange={set('km')} suffix="km" />
          <NumField label="Ostali stroški (pakiranje, dostava …)" value={job.otherCosts} onChange={set('otherCosts')} suffix="€" />
          <NumField label="Popust" value={job.discount} onChange={set('discount')} suffix="€" />
          <NumField label="Drugo delo (po drugi ceni)" value={job.extraWorkH} onChange={set('extraWorkH')} suffix="h" />
          {job.extraWorkH > 0 && <NumField label="Drugo delo – cena" value={job.extraWorkRate} onChange={set('extraWorkRate')} suffix="€/h" />}
          <div className="col-span-2 sm:col-span-3">
            <Check label="Ročno določim strošek materiala (namesto izračuna)" checked={job.printCostOverride !== null} onChange={(v) => set('printCostOverride')(v ? Math.round(r.printCost * 100) / 100 : null)} />
            {job.printCostOverride !== null && <NumField label="Stroški tiska (ročno)" value={job.printCostOverride} onChange={(v) => set('printCostOverride')(v)} suffix="€" />}
          </div>
        </Section>
      </div>

      <div className="space-y-4 lg:sticky lg:top-4 self-start">
        <div className="card">
          <div className="h2">Vse cene za ta posel</div>
          <div className="grid grid-cols-2 gap-2 mt-2">{(() => { const t = allTiers(job, settings); return TIERS.map(([k, l, sub]) => (
            <button key={k} onClick={() => set('mode')(k)} className={`text-left rounded-xl p-3 ring-1 ${k === 'poslovno' ? 'bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-200 dark:ring-emerald-500/30' : 'bg-sky-50 dark:bg-sky-500/10 ring-sky-200 dark:ring-sky-500/30'} ${job.mode === k ? '!ring-2' : ''}`}>
              <div className="text-sm font-semibold">{l}</div>
              <div className="text-2xl font-black tabular-nums">{eur(t[k].gross)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{sub}{job.pieces > 1 ? ` · ${eur(t[k].perPiece)}/kos` : ''}</div>
            </button>)) })()}</div>
          <div className="mt-2 flex justify-between text-sm text-slate-600 dark:text-slate-300"><span>Moj strošek (material, elektrika, obraba, rezerva)</span><b className="tabular-nums">{eur(r.realCosts)}</b></div>
        </div>
        {(() => { const q = quickCalc({ ...quickDefaults, printH: r.printHours, grams: r.kg * 1000, workH: r.laborHours, matKg: mat ? pricePerKg(mat) : 20, printRate: settings.rates.printHourly, workRate: settings.rates.labourHourly, business: job.mode === 'poslovno' })
          const hv = job.mode === 'poslovno' ? q.business : q.total, d = r.gross - hv
          return <div className="card text-sm" data-testid="primerjava"><div className="h2">Primerjava Hitri ↔ Podroben</div>
            <div className="grid grid-cols-2 gap-2"><div className="rounded-xl p-3 bg-slate-50 dark:bg-slate-800/60 ring-1 ring-slate-200 dark:ring-slate-700/60"><div className="text-xs text-slate-500 dark:text-slate-400">Hitri</div><div className="text-xl font-bold tabular-nums">{eur(hv)}</div></div>
            <div className="rounded-xl p-3 bg-slate-50 dark:bg-slate-800/60 ring-1 ring-slate-200 dark:ring-slate-700/60"><div className="text-xs text-slate-500 dark:text-slate-400">Podroben</div><div className="text-xl font-bold tabular-nums">{eur(r.gross)}</div></div></div>
            <div className="mt-2 text-slate-600 dark:text-slate-300">Razlika {d >= 0 ? '+' : ''}{eur(d)} (Podroben upošteva še lepilo/potrošni material{r.digital ? ', datoteko' : ''}{r.transport ? ', prevoz' : ''} in zaokroževanje).</div></div> })()}
        {errors.length > 0 && <div className="card !ring-red-400 text-sm text-red-600">{errors.map((e) => <div key={e}>{e}</div>)}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Big label={`Končna cena – ${job.mode === 'poslovno' ? 'Poslovno' : 'Osebno'}`} tone="green" value={eur(r.gross)} sub={settings.business.vatEnabled ? `brez DDV ${eur(r.net)} · DDV ${eur(r.vat)}` : 'DDV ni obračunan (mali davčni zavezanec)'} /></div>
          <Big label="Cena na kos" value={eur(r.perPiece)} />
          <Big label="Moj strošek tiska" value={eur(r.printCost)} tone="slate" sub={r.printOverridden ? 'ročno določeno · ni v ceni, samo zame' : 'ni v ceni, samo zame'} />
          <Big label="Vrednost storitev" value={eur(r.services + r.digital)} tone="slate" sub={`${num(r.laborHours)} h dela`} />
          <Big label="Predvideni zaslužek" tone={r.belowTarget ? 'red' : 'green'} value={eur(r.earnings)} sub={r.laborHours > 0 ? `${eur(r.earningsPerHour)}/h dela` : undefined} />
        </div>
        {r.belowTarget && <div className="card !ring-orange-400 text-sm text-orange-700 dark:text-orange-300">Zaslužek {eur(r.earningsPerHour)}/h je pod ciljem {eur(settings.business.targetHourly)}/h. Dvigni postavke.</div>}
        {r.minOrderApplied && <div className="card text-sm text-sky-700 dark:text-sky-300">Upoštevano minimalno naročilo {eur(settings.rates.minOrder)}.</div>}

        <div className="card">
          <div className="h2">Razčlenitev</div>
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mt-1">Cena za stranko</div>
          <Row l={`Tisk ${num(r.printHours)} h × ${num(settings.rates.printHourly)} €/h`} v={eur(r.printOverridden ? r.printSale - (job.printCostOverride ?? 0) : r.printHours * settings.rates.printHourly)} />
          {r.printOverridden ? <Row l="Material (ročno)" v={eur(job.printCostOverride ?? 0)} /> : <>
          <Row l={`Material ${num(r.kg * 1000)} g × ${num(r.kg > 0 ? r.material / r.kg : 0)} €/kg`} v={eur(r.material)} />
          {r.adhesive > 0 && <Row l={`Lepilo (${r.adhesiveLabel})`} v={eur(r.adhesive)} />}
          {r.consumables + r.otherDirect > 0 && <Row l="Potrošni material" v={eur(r.consumables + r.otherDirect)} />}</>}
          <Row l={`Moje delo ${num(r.laborHours)} h × ${num(settings.rates.labourHourly)} €/h`} v={eur(r.servicesStandard)} />
          {r.digital > 0 && <Row l={`Datoteka ${job.fileSale.kind.toUpperCase()}`} v={eur(r.digital)} />}
          {r.transport + r.packaging + r.delivery + r.otherCosts > 0 && <Row l="Prevoz, pakiranje, dostava, ostalo" v={eur(r.transport + r.packaging + r.delivery + r.otherCosts)} />}
          {r.invoiceMult !== 1 && <><Row l="Osebno skupaj" v={eur(r.baseTotal)} /><Row l={`Poslovno × ${num(r.invoiceMult)}`} v={`+${eur(r.invoiceExtra)}`} /></>}
          {r.discount > 0 && <Row l="Popust" v={`−${eur(r.discount)}`} />}
          {r.minOrderApplied && <Row l="Minimalno naročilo" v={eur(settings.rates.minOrder)} />}
          <Row l="Skupaj" v={eur(r.netBeforeRounding)} />
          {r.rounding > 0.004 && <Row l={`Zaokroženo navzgor na ${num(settings.rates.roundTo)} €`} v={`+${eur(r.rounding)}`} />}
          <Row l={settings.business.vatEnabled ? 'Končna cena (brez DDV)' : 'Končna cena'} v={eur(r.net)} strong />

          <div className="mt-4 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/40 ring-1 ring-dashed ring-slate-300 dark:ring-slate-600 text-slate-500 dark:text-slate-400" data-testid="moj-strosek">
          <div className="text-xs font-semibold uppercase tracking-wide">Moj strošek – samo zame (da je pokrito)</div>
          <div className="text-xs mb-1">Ni prištet k ceni, samo pokaže, koliko te posel stane.</div>
          {r.printOverridden ? <Row l="Strošek tiska (ročno)" v={eur(r.printCost)} /> : <>
          <Row l={`Material ${num(r.kg * 1000)} g × ${num(r.kg > 0 ? r.material / r.kg : 0)} €/kg`} v={eur(r.material)} />
          <Row l="Elektrika" v={eur(r.electricity)} />
          <Row l="Obraba tiskalnika" v={eur(r.wear)} />
          {r.adhesive > 0 && <Row l={`Lepilo (${r.adhesiveLabel})`} v={eur(r.adhesive)} />}
          <Row l="Potrošni material" v={eur(r.consumables + r.otherDirect)} />
          <Row l={`Rezerva ${num(job.reservePct)} %`} v={eur(r.reserve)} /></>}
          {r.realCosts - r.printCost > 0.004 && <Row l="Prevoz, pakiranje, dostava, ostalo" v={eur(r.realCosts - r.printCost)} />}
          <Row l="Moj strošek skupaj" v={eur(r.realCosts)} strong />
          </div>
          <div className="mt-3 flex justify-between items-baseline"><span className="font-semibold">Dobiček (končna cena − moj strošek)</span><span className="text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400" data-testid="dobicek">{eur(r.profit)}</span></div>
          <FloorBox f={jobFloor(r, settings)} biz={job.mode === 'poslovno'} rate={settings.rates.labourHourly} />
          <div className="text-xs font-semibold text-slate-400 mt-3">Od dobička do zaslužka</div>
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
