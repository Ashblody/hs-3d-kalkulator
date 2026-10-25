export type Mode = 'stranka' | 'prijatelj' | 'zase'
export type OrderType = 'tisk' | 'sken' | 'cad' | 'kombinirano' | 'digitalno'
export type Status = 'osnutek' | 'ponudba' | 'potrjeno' | 'izdelava' | 'zakljuceno'

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
  /** Prijatelj: € na uro tiskanja namesto % pribitka */
  friendPrintHourly: number
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
