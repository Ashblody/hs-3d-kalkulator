import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState } from './store'
import { AuthError, effectiveClientId, envClientId, hasValidToken, loadPrefs, payload, requestToken, savePrefs, signOut, syncOnce, tokenGetter, type SyncPrefs } from './gdrive'

type Status = 'idle' | 'sync' | 'ok' | 'offline' | 'auth' | 'error'
const labels: Record<Status, string> = { idle: 'Ni prijave', sync: 'Sinhroniziram …', ok: 'Sinhronizirano', offline: 'Brez povezave – sinhroniziram, ko bo spet na voljo', auth: 'Potrebna ponovna prijava', error: 'Napaka pri sinhronizaciji' }

/** Sinhronizacija z Google Drive (appDataFolder): ob zagonu pull+merge, ob spremembah push z zamikom */
export function useDriveSync(st: AppState, setSt: (f: (s: AppState) => AppState) => void, flash: (m: string) => void) {
  const [prefs, setPrefsS] = useState<SyncPrefs>(loadPrefs)
  const [status, setStatus] = useState<Status>(prefs.signedIn ? 'sync' : 'idle')
  const stRef = useRef(st); stRef.current = st
  const lastPushed = useRef<string>('')
  const busy = useRef(false)
  const setPrefs = (p: SyncPrefs) => { savePrefs(p); setPrefsS(p) }
  const clientId = effectiveClientId(prefs)

  const run = useCallback(async (manual = false) => {
    if (!clientId || busy.current) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) { setStatus('offline'); return }
    busy.current = true; setStatus('sync')
    try {
      const res = await syncOnce(stRef.current, { fetch: (...a) => fetch(...a), getToken: tokenGetter(clientId) })
      lastPushed.current = payload(res.state)
      if (res.remoteChanged) setSt((s) => ({ ...res.state, current: s.current, currentId: s.currentId, dark: s.dark }))
      const p = { ...loadPrefs(), signedIn: true, lastSync: new Date().toISOString() }; setPrefs(p); setStatus('ok')
      if (manual || res.remoteChanged) flash(res.remoteChanged ? `Iz Drive: ${res.added} novih, ${res.updated} posodobljenih` : 'Sinhronizirano')
    } catch (e) {
      setStatus(e instanceof AuthError ? 'auth' : !navigator.onLine || e instanceof TypeError ? 'offline' : 'error')
    } finally { busy.current = false }
  }, [clientId])

  // ob zagonu
  useEffect(() => { if (prefs.signedIn && clientId) run() }, [])
  // ob vrnitvi povezave
  useEffect(() => { const h = () => { if (loadPrefs().signedIn) run() }; window.addEventListener('online', h); return () => window.removeEventListener('online', h) }, [run])
  // push z zamikom ob spremembah
  useEffect(() => {
    if (!prefs.signedIn || !clientId) return
    const pl = payload(st)
    if (pl === lastPushed.current) return
    const t = setTimeout(() => run(), 4000)
    return () => clearTimeout(t)
  }, [st.projects, st.customers, st.settings, st.deleted, prefs.signedIn])

  const signIn = async () => {
    if (!clientId) { alert('Najprej vpiši OAuth Client ID.'); return }
    try { await requestToken(clientId, hasValidToken() ? '' : 'consent'); setPrefs({ ...loadPrefs(), signedIn: true }); await run(true) }
    catch { setStatus('auth'); flash('Prijava ni uspela') }
  }
  const logout = () => { signOut(); setPrefs({ ...loadPrefs(), signedIn: false }); setStatus('idle') }
  return { prefs, setPrefs, status, run, signIn, logout }
}

export function DriveSyncCard({ sync }: { sync: ReturnType<typeof useDriveSync> }) {
  const { prefs, setPrefs, status, run, signIn, logout } = sync
  const [cid, setCid] = useState(prefs.clientId)
  return (
    <div className="card mb-4" data-testid="drive-sync">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-semibold mr-auto">Sinhronizacija z Google Drive</span>
        {prefs.signedIn
          ? <><button className="btn-p" disabled={status === 'sync'} onClick={() => run(true)}>Sinhroniziraj zdaj</button><button className="btn" onClick={logout}>Odjava</button></>
          : <button className="btn-p" onClick={signIn}>Prijava z Googlom</button>}
        {prefs.signedIn && status === 'auth' && <button className="btn" onClick={signIn}>Prijavi se znova</button>}
      </div>
      <label className="block mt-3"><span className="lbl">OAuth Client ID{envClientId && !prefs.clientId ? ' (vgrajen)' : ''}</span>
        <input className="inp font-mono text-xs" placeholder={envClientId || '1234567890-xxxx.apps.googleusercontent.com'} value={cid}
          onChange={(e) => setCid(e.target.value)} onBlur={() => setPrefs({ ...loadPrefs(), clientId: cid.trim() })} /></label>
      <div className="text-sm mt-2"><span className={status === 'ok' ? 'text-emerald-600' : status === 'error' || status === 'auth' ? 'text-red-500' : 'text-slate-500'} data-testid="sync-status">{labels[status]}</span>
        <span className="text-slate-500"> · zadnja sinhronizacija: {prefs.lastSync ? new Date(prefs.lastSync).toLocaleString('sl-SI') : '—'}</span></div>
      <p className="text-xs text-slate-500 mt-2">Podatki se shranijo v skrito mapo aplikacije na tvojem Google Drivu (datoteka hs3d-kopija.json). Ob zagonu se prenesejo in združijo (novejše zmaga), spremembe se naložijo samodejno. Na drugi napravi se prijavi z istim Google računom.</p>
    </div>
  )
}
