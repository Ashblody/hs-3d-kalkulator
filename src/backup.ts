import type { AppState } from './store'
import { normalize } from './store'
import { saveFile } from './exporters'

export async function exportJson(state: AppState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  return saveFile(blob, `hs3d-kopija-${new Date().toISOString().slice(0, 10)}.json`)
}

export async function importJson(file: File): Promise<AppState> {
  return normalize(JSON.parse(await file.text()))
}

/** Združi uvoženo kopijo: projekti po id (novejši updatedAt zmaga), materiali/tiskalniki po id; cenik ostane lokalni */
export function mergeStates(local: AppState, inc: AppState): { state: AppState; added: number; updated: number } {
  const byId = new Map(local.projects.map((p) => [p.id, p]))
  let added = 0, updated = 0
  for (const p of inc.projects) {
    const cur = byId.get(p.id)
    if (!cur) { byId.set(p.id, p); added++ } else if ((p.updatedAt ?? '') > (cur.updatedAt ?? '')) { byId.set(p.id, p); updated++ }
  }
  const mergeList = <T extends { id: string }>(a: T[], b: T[]) => [...a, ...b.filter((x) => !a.some((y) => y.id === x.id))]
  return {
    state: { ...local, projects: [...byId.values()], settings: { ...local.settings, materials: mergeList(local.settings.materials, inc.settings.materials), printers: mergeList(local.settings.printers, inc.settings.printers) } },
    added, updated,
  }
}
