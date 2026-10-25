import type { AppState } from './store'
import { normalize } from './store'

export function exportJson(state: AppState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `hs3d-kopija-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export async function importJson(file: File): Promise<AppState> {
  return normalize(JSON.parse(await file.text()))
}
