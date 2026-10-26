import { useState } from 'react'
import Calculator from './Calculator'
import SettingsView from './SettingsView'
import ProjectsView from './ProjectsView'
import { duplicateProject, hasUnsaved, newProject, startBlank, usePersistentState } from './store'
import type { JobInput, Project, Settings } from './types'
import Dashboard from './Dashboard'
import Quote from './Quote'
import Quick from './Quick'
import { copyText, jobText } from './quick'
import { exportJson, importJson } from './backup'

type Tab = 'kalk' | 'hitri' | 'projekti' | 'posel' | 'nastavitve'
const tabs: [Tab, string][] = [['kalk', 'Kalkulator'], ['hitri', 'Hitri izračun'], ['projekti', 'Projekti'], ['posel', 'Posel'], ['nastavitve', 'Nastavitve']]

export default function App() {
  const [st, setSt] = usePersistentState()
  const [tab, setTab] = useState<Tab>('kalk')
  const [msg, setMsg] = useState('')
  const [quote, setQuote] = useState<{ job: JobInput; settings: Settings; number: string } | null>(null)
  const printQuote = (job: JobInput, settings: Settings, id: string) => {
    setQuote({ job, settings, number: `${job.date.replace(/-/g, '')}-${id.slice(0, 4).toUpperCase()}` })
    const prev = document.title; document.title = `HS3D ponudba ${job.name}`
    setTimeout(() => { window.print(); document.title = prev }, 100)
  }
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const project = st.projects.find((p) => p.id === st.currentId)
  const calcSettings = project ? project.snapshot : st.settings

  const save = () => {
    if (project) {
      setSt({ ...st, projects: st.projects.map((p) => (p.id === project.id ? { ...p, input: structuredClone(st.current), updatedAt: new Date().toISOString() } : p)) })
    } else {
      const p = newProject(st.current, st.settings)
      setSt({ ...st, projects: [...st.projects, p], currentId: p.id })
    }
    flash('Projekt shranjen')
  }
  const open = (p: Project) => { setSt({ ...st, current: structuredClone(p.input), currentId: p.id }); setTab('kalk') }
  const copy = (p: Project) => {
    const c = duplicateProject(p, st.settings)
    setSt({ ...st, projects: [...st.projects, c], current: structuredClone(c.input), currentId: c.id }); setTab('kalk'); flash('Kopija uporablja trenutni cenik')
  }
  const actions = (
    <div className="card flex flex-wrap gap-2 no-print">
      <button className="btn-p" onClick={save}>{project ? 'Shrani projekt' : 'Shrani kot nov projekt'}</button>
      <button className="btn" title="Prazen projekt: vse ure, grami, čas tiska in km na 0, 1 kos, brez datoteke. Nastavitve, materiali in tiskalniki ostanejo." onClick={() => { if (!hasUnsaved(st) || window.confirm('Trenutni projekt ni shranjen. Začnem nov prazen projekt in zavržem spremembe?')) { setSt(startBlank(st)); flash('Nov prazen projekt') } }}>Nov projekt</button>
      {project && <button className="btn" onClick={() => copy(project)}>Podvoji projekt</button>}
      <button className="btn" onClick={async () => flash((await copyText(jobText(st.current, calcSettings))) ? 'Izračun kopiran' : 'Kopiranje ni uspelo')}>Kopiraj izračun</button>
      <button className="btn" onClick={() => printQuote(st.current, calcSettings, project?.id ?? 'nova')}>PDF ponudba</button>
      {project && <button className="btn" onClick={() => setSt({ ...st, projects: st.projects.map((p) => (p.id === project.id ? { ...p, snapshot: structuredClone(st.settings) } : p)) })}>Uporabi trenutni cenik</button>}
    </div>
  )

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-100">
      {quote && <div className="hidden print:block"><Quote {...quote} /></div>}
    <div className="no-print">
      <header className="sticky top-0 z-10 bg-slate-900 text-white no-print">
        <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="font-bold text-lg"><span className="text-orange-400">HS</span> 3D <span className="font-normal text-slate-400 text-sm">Kalkulator</span></div>
          <nav className="order-3 sm:order-none w-full sm:w-auto flex gap-1 sm:ml-auto overflow-x-auto">
            {tabs.map(([t, l]) => <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${tab === t ? 'bg-white/15 font-semibold' : 'text-slate-300'}`}>{l}</button>)}
          </nav>
          <button aria-label="Svetli/temni način" className="ml-auto sm:ml-0 px-2 text-lg" onClick={() => setSt({ ...st, dark: !st.dark })}>{st.dark ? '☀️' : '🌙'}</button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4">
        {msg && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg z-20">{msg}</div>}
        {tab === 'kalk' && (<>
          {project && <div className="text-xs text-slate-500 mb-2">Projekt uporablja cenik, shranjen {new Date(project.createdAt).toLocaleDateString('sl-SI')}. Spremembe splošnega cenika nanj ne vplivajo.</div>}
          <Calculator job={st.current} settings={calcSettings} onChange={(current) => setSt({ ...st, current })} actions={actions} />
        </>)}
        {tab === 'projekti' && <ProjectsView projects={st.projects} currentId={st.currentId} onOpen={open} onCopy={copy}
          onDelete={(p) => setSt({ ...st, projects: st.projects.filter((x) => x.id !== p.id), currentId: st.currentId === p.id ? null : st.currentId })}
          onPdf={(p) => printQuote(p.input, p.snapshot, p.id)}
          onActual={(p, actual) => setSt({ ...st, projects: st.projects.map((x) => (x.id === p.id ? { ...x, actual } : x)) })}
          onStatus={(p, status) => setSt({ ...st, projects: st.projects.map((x) => (x.id === p.id ? { ...x, status, updatedAt: new Date().toISOString() } : x)) })} />}
        {tab === 'hitri' && <Quick settings={st.settings} flash={flash} />}
        {tab === 'posel' && <Dashboard projects={st.projects} settings={st.settings} />}
        {tab === 'nastavitve' && (<>
          <div className="card mb-4 flex flex-wrap gap-2 items-center">
            <span className="font-semibold mr-auto">Varnostna kopija</span>
            <button className="btn-p" onClick={() => exportJson(st)}>Izvozi JSON</button>
            <label className="btn cursor-pointer">Uvozi JSON<input type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return
              try { const s = await importJson(f); if (confirm(`Uvozim ${s.projects.length} projektov? Trenutni podatki bodo zamenjani.`)) { setSt(s); flash('Podatki obnovljeni') } } catch { alert('Datoteke ni mogoče prebrati.') }
              e.target.value = ''
            }} /></label>
          </div>
          <SettingsView s={st.settings} onChange={(settings) => setSt({ ...st, settings })} />
        </>)}
      </main>
    </div>
    </div>
  )
}
