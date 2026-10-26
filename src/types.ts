/** Osebno = na roke; Poslovno = z računom (× invoiceMultiplier) */
export type Mode = 'osebno' | 'poslovno'
export type OrderType = 'tisk' | 'sken' | 'cad' | 'kombinirano' | 'digitalno'
export type Status = 'ponudba' | 'sprejeto' | 'natisnjeno' | 'placano'
/** plošča iz slicerja (Bambu Studio / PrusaSlicer) */
export interface Plate { hours: number; minutes: number; grams: number; materialId: string }

export interface Printer {
  id: string
  name: string
  price: number
  lifeHours: number
  service: number
  /** povprečna moč v W po vrsti materiala; 'default' za ostale */
  powerW: Record<string, number>
  note?: string
}

export interface MaterialPrice { label: string; price: number }
export interface Material {
  id: string
  name: string
  maker: string
  type: string
  spoolG: number
  prices: MaterialPrice[]
  activePrice: number
  dryTemp?: string
  source?: string
}

export interface Rates {
  /** fiksni doplačili za datoteko zraven tiska */
  fileAddonStl: number
  /** zaokroževanje ponudbe navzgor: 0 = izklop, 1 ali 5 € */
  roundTo: number
  fileAddonStep: number
  /** v4: tisk po fiksni ceni na uro tiskalnika (material posebej po strošku) */
  printHourly: number
  /** v4: ena postavka za moje delo (sken, obdelava, CAD, slicer, dodelava) */
  labourHourly: number
  /** v4: Z računom (s.p.) – celota × faktor */
  invoiceMultiplier: number
  scan: number
  edit: number
  cad: number
  reverse: number
  prep: number
  km: number
  minOrder: number
  markupPct: number
  reservePct: number
  friendDiscountPct: number
}

export interface Business {
  targetHourly: number
  billableHours: number
  monthlyFixed: number
  kwhPrice: number
  taxPct: number
  vatEnabled: boolean
  vatPct: number
}

export type DigitalKind = 'raw' | 'stl' | 'cadstl' | 'step' | 'stepscan' | 'paket'
export type FileSaleKind = 'none' | 'stl' | 'step'
export interface FileSale { kind: FileSaleKind }
export interface DigitalItem { on: boolean; hours: number; rate: number; extra: number }

export interface JobInput {
  name: string
  client: string
  date: string
  description: string
  mode: Mode
  orderType: OrderType
  printerId: string
  materialId: string
  pieces: number
  gramsPerPiece: number
  hoursPerPiece: number
  minutesPerPiece: number
  useBatchTime: boolean
  /** vnos po ploščah iz slicerja – sešteje čas in grame */
  usePlates: boolean
  plates: Plate[]
  batchHours: number
  batchMinutes: number
  extraMaterialG: number
  consumables: number
  otherDirect: number
  reservePct: number
  markupPct: number
  printCostOverride: number | null
  scanH: number
  editH: number
  cadH: number
  reverseH: number
  prepH: number
  finishH: number
  extraWorkH: number
  extraWorkRate: number
  km: number
  packaging: number
  delivery: number
  otherCosts: number
  discount: number
  friendDiscountPct: number
  digital: Record<DigitalKind, DigitalItem>
  /** datoteka zraven tiska (fiksno doplačilo) */
  fileSale: FileSale
  rights: { physicalOnly: boolean; personalUse: boolean; commercial: boolean; sourceCad: boolean }
}

export interface Settings { printers: Printer[]; materials: Material[]; materialSeeds?: string[]; ratesVersion?: number; rates: Rates; business: Business }

export interface Actuals { printHours: number; grams: number; laborHours: number }

export interface Project {
  id: string
  status: Status
  createdAt: string
  updatedAt: string
  input: JobInput
  /** posnetek cenika ob shranjevanju */
  snapshot: Settings
  actual: Actuals
}
