import type { Project } from './types'
import { calculate, isPrinting } from './calc'

/** Ocene iz shranjenih projektov; ničelni dejanski podatki pomenijo, da poraba ni vnesena. */
export function businessInsights(projects: Project[]) {
  const printers = new Map<string, { id: string; name: string; projects: number; hours: number; cost: number }>()
  const materials = new Map<string, { id: string; name: string; grams: number }>()
  let paidValue = 0, actualWork = 0, actualPrint = 0, actualGrams = 0
  let actualWorkCount = 0, actualPrintCount = 0, actualMaterialCount = 0
  for (const p of projects) {
    const j = p.input, r = calculate(j, p.snapshot)
    const actual = p.actual ?? { laborHours: 0, printHours: 0, grams: 0 }
    if (p.status === 'placano') paidValue += r.net
    if (actual.laborHours > 0) { actualWork += actual.laborHours; actualWorkCount++ }
    if (!isPrinting(j)) continue
    if (actual.printHours > 0) { actualPrint += actual.printHours; actualPrintCount++ }
    if (actual.grams > 0) { actualGrams += actual.grams; actualMaterialCount++ }
    const printer = p.snapshot.printers.find(x => x.id === j.printerId)
    const old = printers.get(j.printerId) ?? { id: j.printerId, name: printer?.name ?? 'Neznan tiskalnik', projects: 0, hours: 0, cost: 0 }
    old.projects++; old.hours += r.printHours; old.cost += r.printCost; printers.set(j.printerId, old)
    const factor = 1 + r.wastePct / 100
    const addMaterial = (id: string, grams: number) => {
      if (!Number.isFinite(grams) || grams <= 0) return
      const mat = p.snapshot.materials.find(x => x.id === id)
      const item = materials.get(id) ?? { id, name: mat?.name ?? 'Neznan material', grams: 0 }
      item.grams += grams * factor; materials.set(id, item)
    }
    if (j.usePlates) {
      for (const plate of j.plates ?? []) { addMaterial(plate.materialId, plate.grams); for (const m of plate.additionalMaterials ?? []) addMaterial(m.materialId, m.grams) }
    } else addMaterial(j.materialId, Math.max(0, j.pieces) * j.gramsPerPiece)
    addMaterial(j.materialId, j.extraMaterialG)
  }
  return { printers: [...printers.values()], materials: [...materials.values()], paidValue, actualWork, actualPrint, actualGrams, actualWorkCount, actualPrintCount, actualMaterialCount }
}
