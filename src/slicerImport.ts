import { parseDuration } from './duration'

export interface SlicerPreview {
  minutes: number | null
  grams: number | null
  timeSource: string | null
  weightSource: string | null
  multipleWeights: boolean
}

/** Bere izključno opisne komentarje; G-kode ne izvaja in ne sklepa o številu kosov. */
export function readSlicerGcode(text: string): SlicerPreview {
  const match = (pattern: RegExp) => text.match(pattern)?.[1]?.trim() ?? null
  // Bambu pogosto navaja oba časa v isti vrstici. Skupni čas vključuje tudi pripravo.
  const totalTime = match(/^\s*;[^\r\n]*?\btotal estimated time\s*[:=]\s*([^;\r\n]+)/im)
  const prusaTime = match(/^\s*;\s*estimated printing time\s*\(normal mode\)\s*=\s*([^;\r\n]+)/im)
  const modelTime = match(/^\s*;\s*model printing time\s*[:=]\s*([^;\r\n]+)/im)
  const timeText = totalTime ?? prusaTime ?? modelTime
  const parsedTime = timeText ? parseDuration(timeText) : null
  const totalWeight = match(/^\s*;\s*total filament (?:used|weight)\s*\[g\]\s*[:=]\s*([^;\r\n]+)/im)
  const perWeight = match(/^\s*;\s*filament used\s*\[g\]\s*[:=]\s*([^;\r\n]+)/im)
  const singleNumber = (s: string | null) => s && /^\d+(?:\.\d+)?$/.test(s) ? Number(s) : null
  const perValues = perWeight?.split(/\s*,\s*/).filter(Boolean) ?? []
  const multipleWeights = perValues.length > 1
  const grams = multipleWeights ? null : singleNumber(totalWeight) ?? singleNumber(perWeight)
  return {
    minutes: parsedTime !== null && parsedTime > 0 ? Math.ceil(parsedTime) : null,
    grams: grams !== null && Number.isFinite(grams) && grams > 0 ? grams : null,
    timeSource: totalTime ? 'skupni ocenjeni čas' : prusaTime ? 'normalni način' : modelTime ? 'čas modela' : null,
    weightSource: totalWeight ? 'skupna masa' : perWeight && !multipleWeights ? 'masa filamenta' : null,
    multipleWeights,
  }
}
