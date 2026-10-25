import type { DigitalKind, JobInput, Material, Printer, Rates, Business, Settings } from './types'

export const printers: Printer[] = [
  { id: 'x2d', name: 'Bambu Lab X2D Combo', price: 870.4, lifeHours: 3000, service: 200, powerW: { ASA: 450, default: 450 }, note: 'Moč je ocena, dokler je ne izmeriš.' },
  { id: 'indx', name: 'Prusa CORE One INDX', price: 2249, lifeHours: 3000, service: 100, powerW: {}, note: 'Vnesi izmerjeno moč.' },
  { id: 'mars2', name: 'Elegoo Mars 2 Pro', price: 450, lifeHours: 3000, service: 200, powerW: {}, note: 'Vnesi izmerjeno moč.' },
  { id: 'form', name: 'Formlabs Form Studio 1', price: 1650, lifeHours: 3000, service: 200, powerW: {}, note: 'Cena sistema za začetek. Vnesi izmerjeno moč.' },
]

const m = (id: string, name: string, maker: string, type: string, price: number): Material => ({
  id, name, maker, type, spoolG: 1000, prices: [{ label: 'Redna', price }], activePrice: 0,
})

export const materials: Material[] = [
  m('bambu-pla', 'Bambu PLA Basic', 'Bambu Lab', 'PLA', 13),
  m('bambu-petg', 'Bambu PETG HF', 'Bambu Lab', 'PETG', 13),
  m('bambu-asa', 'Bambu ASA', 'Bambu Lab', 'ASA', 26.64),
  m('pm-pla', 'Prusament PLA', 'Prusa', 'PLA', 32),
  m('pm-petg', 'Prusament PETG', 'Prusa', 'PETG', 32),
  m('pm-asa', 'Prusament ASA', 'Prusa', 'ASA', 32),
  m('trcek-pla', 'Plastika Trček PLA', 'Plastika Trček', 'PLA', 21),
  m('trcek-petg', 'Plastika Trček PETG', 'Plastika Trček', 'PETG', 22),
  m('pm-pc', 'Prusament PC Blend', 'Prusa', 'PC', 46.39),
  m('trcek-tpu', 'Plastika Trček TPU', 'Plastika Trček', 'TPU', 38.57),
  m('pm-petgcf', 'Prusament PETG-CF', 'Prusa', 'PETG-CF', 60),
]

/** cene preverjene 25. 10. 2026 (z DDV); povezave v opombi `source` */
const x = (id: string, name: string, maker: string, type: string, spoolG: number, regular: number, sale: [string, number] | null, source: string, dryTemp?: string): Material => ({
  id, name, maker, type, spoolG, prices: sale ? [{ label: 'Redna', price: regular }, { label: sale[0], price: sale[1] }] : [{ label: 'Redna', price: regular }],
  activePrice: 0, source, ...(dryTemp ? { dryTemp } : {}),
})
const BB = 'https://eu.store.bambulab.com/products/'
const PR = 'https://www.prusa3d.com/de/kategorie/'
const TR = 'https://3dtrcek.com/sl/'

/** v2: dodani materiali (migracija jih doda obstoječim uporabnikom) */
export const materialsV2: Material[] = [
  x('bb2-pla', 'Bambu PLA Basic (1 kg)', 'Bambu Lab', 'PLA', 1000, 16.99, ['Bulk 10+', 11.04], BB + 'pla-basic-filament'),
  x('bb2-petghf', 'Bambu PETG HF (1 kg)', 'Bambu Lab', 'PETG', 1000, 19.99, ['Bulk 10+', 12.99], BB + 'petg-hf'),
  x('bb2-petgb', 'Bambu PETG Basic (1 kg)', 'Bambu Lab', 'PETG', 1000, 15.99, ['Bulk 10+', 10.39], BB + 'petg-basic'),
  x('bb2-asa', 'Bambu ASA (1 kg)', 'Bambu Lab', 'ASA', 1000, 24.99, null, BB + 'asa-filament'),
  x('bb2-abs', 'Bambu ABS (1 kg)', 'Bambu Lab', 'ABS', 1000, 16.99, ['Bulk 10+', 11.04], BB + 'abs-filament'),
  x('bb2-pc', 'Bambu PC (1 kg)', 'Bambu Lab', 'PC', 1000, 42.99, null, BB + 'pc-filament'),
  x('bb2-pa6cf', 'Bambu PA6-CF najlon (1 kg)', 'Bambu Lab', 'PA', 1000, 44.99, null, BB + 'pa6-cf'),
  x('pm2-pla', 'Prusament PLA (1 kg)', 'Prusa', 'PLA', 1000, 32.99, ['Akcija -20 %', 26.39], PR + 'prusament-pla/'),
  x('pm2-petg', 'Prusament PETG (1 kg)', 'Prusa', 'PETG', 1000, 32.99, ['Akcija -20 %', 26.39], PR + 'prusament-petg/'),
  x('pm2-petg2', 'Prusament PETG (2 kg)', 'Prusa', 'PETG', 2000, 54.99, ['Akcija -30 %', 38.49], PR + 'prusament-petg/'),
  x('pm2-asa', 'Prusament ASA (800 g)', 'Prusa', 'ASA', 800, 30.99, ['Akcija -20 %', 24.79], PR + 'prusament-asa/'),
  x('pm2-pc', 'Prusament PC Blend (900 g)', 'Prusa', 'PC', 900, 50.99, ['Akcija -40 %', 30.59], PR + 'prusament-pc-blend/'),
  x('pm2-pa11', 'Prusament PA11 Natural najlon (800 g)', 'Prusa', 'PA', 800, 107, ['Akcija -20 %', 85.6], PR + 'prusament-pa-nylon/'),
  x('tr2-pla', 'Trček PLA (1 kg)', 'Plastika Trček', 'PLA', 1000, 19.49, ['20+ kosov', 11.69], TR + 'pla-filament', '50 °C'),
  x('tr2-pla5', 'Trček PLA (5 kg)', 'Plastika Trček', 'PLA', 5000, 99.95, null, TR + 'pla-filament', '50 °C'),
  x('tr2-petg', 'Trček PETG (1 kg)', 'Plastika Trček', 'PETG', 1000, 19.49, ['20+ kosov', 11.69], TR + 'petg-filament', '60 °C, 2–4 h'),
  x('tr2-petg10', 'Trček PETG (10 kg)', 'Plastika Trček', 'PETG', 10000, 188.9, null, TR + 'petg-filament', '60 °C, 2–4 h'),
  x('tr2-asa', 'Trček ASA+ (800 g)', 'Plastika Trček', 'ASA', 800, 21.9, ['20+ kosov', 13.14], TR + 'asa-plus-filament', '60 °C, 4–8 h'),
  x('tr2-abs', 'Trček ABS+ (1 kg)', 'Plastika Trček', 'ABS', 1000, 21.99, null, TR + 'abs-plus-filament', '60 °C, 4–8 h'),
  x('tr2-pc', 'Trček PC (1 kg)', 'Plastika Trček', 'PC', 1000, 47.99, null, TR + 'pc-filament'),
  x('tr2-pa12', 'Trček Nylon PA12 (700 g)', 'Plastika Trček', 'PA', 700, 33.99, null, TR + 'nylon-pa-12-filament'),
  x('tr2-pctg', 'Trček PCTG (1 kg)', 'Plastika Trček', 'PCTG', 1000, 27.99, ['20+ kosov', 16.79], TR + 'pctg-filament'),
]
export const materialsV1Ids = materials.map((m) => m.id)

/** privzete cene pred v3 (za migracijo) */
export const ratesV1 = { scan: 25, edit: 20, cad: 25, reverse: 30, prep: 20, markupPct: 50 } as const

export const rates: Rates = {
  scan: 20, edit: 15, cad: 20, reverse: 25, prep: 15, km: 0.3, minOrder: 15,
  markupPct: 100, reservePct: 10, friendDiscountPct: 15, friendPrintHourly: 1,
}

export const business: Business = {
  targetHourly: 15, billableHours: 20, monthlyFixed: 138.01, kwhPrice: 0.2,
  taxPct: 0, vatEnabled: false, vatPct: 22,
}

export const defaultSettings = (): Settings => structuredClone({ printers, materials: [...materials, ...materialsV2], materialSeeds: [...materials, ...materialsV2].map((m) => m.id), ratesVersion: 3, rates, business })

export const digitalLabels: Record<DigitalKind, string> = {
  raw: 'Surov 3D-sken (OBJ/STL)',
  stl: 'Očiščen in popravljen STL',
  cadstl: 'CAD-model izvožen v STL',
  step: 'Parametrični CAD-model, STEP',
  stepscan: 'Rekonstrukcija STEP iz skena',
  paket: 'Celoten paket STL + STEP + dokumentacija',
}

const emptyDigital = (r: Rates): JobInput['digital'] => ({
  raw: { on: false, hours: 0, rate: r.scan, extra: 0 },
  stl: { on: false, hours: 0, rate: r.edit, extra: 0 },
  cadstl: { on: false, hours: 0, rate: r.cad, extra: 0 },
  step: { on: false, hours: 0, rate: r.cad, extra: 0 },
  stepscan: { on: false, hours: 0, rate: r.reverse, extra: 0 },
  paket: { on: false, hours: 0, rate: r.cad, extra: 0 },
})

export const emptyJob = (r: Rates = rates): JobInput => ({
  name: 'Nov projekt', client: '', date: new Date().toISOString().slice(0, 10), description: '',
  mode: 'stranka', orderType: 'tisk', printerId: 'x2d', materialId: 'bambu-pla',
  pieces: 1, gramsPerPiece: 0, hoursPerPiece: 0, minutesPerPiece: 0,
  useBatchTime: false, batchHours: 0, batchMinutes: 0, extraMaterialG: 0,
  consumables: 0, otherDirect: 0, reservePct: r.reservePct, markupPct: r.markupPct, printCostOverride: null,
  scanH: 0, editH: 0, cadH: 0, reverseH: 0, prepH: 0, finishH: 0, extraWorkH: 0, extraWorkRate: r.prep,
  km: 0, packaging: 0, delivery: 0, otherCosts: 0, discount: 0, friendDiscountPct: r.friendDiscountPct,
  digital: emptyDigital(r),
  rights: { physicalOnly: true, personalUse: false, commercial: false, sourceCad: false },
})

export const demoJob = (): JobInput => ({
  ...emptyJob(),
  name: 'Nosilci lučk – 2 leva + 2 desna',
  client: 'Demo',
  date: '2026-10-25',
  description: 'Sken s Creality Pika, urejanje skena, CAD, tisk v ASA.',
  orderType: 'kombinirano',
  printerId: 'x2d', materialId: 'bambu-asa',
  pieces: 4, gramsPerPiece: 192, hoursPerPiece: 4, minutesPerPiece: 42,
  consumables: 3.4, reservePct: 10, markupPct: 100,
  scanH: 1, editH: 1, cadH: 0.75, prepH: 0.25, finishH: 0.5, km: 0,
})
