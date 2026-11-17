import { blankJob } from './seed'
import { newProject } from './store'
import type { Project, Settings } from './types'

/** Ustvari samo manjkajoča primera, brez prepisovanja uporabnikovih projektov. */
export function makeExampleProjects(settings: Settings, existing: Project[]): Project[] {
  const hasCode = (code: string) => existing.some(p => p.tracking?.code === code || (p.input.name ?? '').includes(code))
  const asa = settings.materials.find(m => m.type.toUpperCase() === 'ASA')?.id
  const examples: Project[] = []
  if (!hasCode('0002')) {
    const j = { ...blankJob(settings.rates), name: '0002 – Nosilec luči za gasilsko vozilo', date: '', description: '2 leva in 2 desna nosilca. ASA. Mere: baza Ø118 mm, prirobnica Ø112 mm, 3 luknje na PCD Ø98 mm, višina 30 mm.', pieces: 4, gramsPerPiece: 200, hoursPerPiece: 5, scanH: 1, editH: 1, prepH: 0.25, ...(asa ? { materialId: asa } : {}) }
    const p = newProject(j, settings); p.status = 'neznano'
    p.tracking = { code: '0002', notes: 'Podatki so približni: tisk skupaj ~20 h in ~800 g; sken in čiščenje po ~1 h; CAD 30–60 min (še ni vnesen v izračun); slicer ~15 min. Obračunana cena je bila 150 €. Status, datum in material preveri; izračunana cena ni nujno obračunana cena.' }
    examples.push(p)
  }
  if (!hasCode('0003')) {
    const j = { ...blankJob(settings.rates), name: '0003 – Ford Bronco, obrobe blatnikov', date: '', description: 'Testni oziroma začasni komplet. Skena desnega sprednjega in zadnjega blatnika. Modeliranje v Fusion 360, možnost zrcaljenja za levo stran.', ...(asa ? { materialId: asa } : {}) }
    const p = newProject(j, settings); p.status = 'neznano'
    p.tracking = { code: '0003', notes: 'Približni podatki: pnevmatike štrlijo 7–8 cm spredaj in 6 cm zadaj. Predvidoma trije segmenti na obrobo. ASA; tisk na X2D ali INDX. Količine, cena in status še niso potrjeni.' }
    examples.push(p)
  }
  return examples
}
