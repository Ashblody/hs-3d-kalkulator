import type { AppState } from './store'
import { normalize } from './store'
import { mergeStates } from './backup'

export const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
export const FILE_NAME = 'hs3d-kopija.json'
const API = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'

export class AuthError extends Error { constructor() { super('auth') } }
export interface DriveCtx { fetch: typeof fetch; getToken: (force?: boolean) => Promise<string> }

/** klic z avtomatsko obnovo žetona ob 401 (en ponovni poskus) */
async function call(ctx: DriveCtx, url: string, init: RequestInit = {}): Promise<Response> {
  for (let i = 0; i < 2; i++) {
    const tok = await ctx.getToken(i > 0)
    const res = await ctx.fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${tok}` } })
    if (res.status === 401) { if (i === 0) continue; throw new AuthError() }
    if (!res.ok) throw new Error(`Drive ${res.status}`)
    return res
  }
  throw new AuthError()
}

export async function findFile(ctx: DriveCtx): Promise<string | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`)
  const r = await call(ctx, `${API}?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`)
  const j = await r.json() as { files?: { id: string }[] }
  return j.files?.[0]?.id ?? null
}

export async function download(ctx: DriveCtx, id: string): Promise<unknown> {
  return (await call(ctx, `${API}/${id}?alt=media`)).json()
}

export async function upload(ctx: DriveCtx, id: string | null, body: string): Promise<string> {
  if (id) { await call(ctx, `${UPLOAD}/${id}?uploadType=media`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body }); return id }
  const boundary = 'hs3d' + Math.random().toString(36).slice(2)
  const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] })}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`
  const r = await call(ctx, `${UPLOAD}?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart })
  return ((await r.json()) as { id: string }).id
}

/** kaj gre v oblak (brez trenutnega osnutka in teme) */
export const payload = (s: AppState) => JSON.stringify({ ...s, current: undefined, currentId: null })

/** Prenesi + združi (novejši zmaga) + naloži nazaj. Vrne združeno stanje. */
export async function syncOnce(local: AppState, ctx: DriveCtx): Promise<{ state: AppState; added: number; updated: number; remoteChanged: boolean }> {
  const id = await findFile(ctx)
  let state = local, added = 0, updated = 0
  if (id) {
    const raw = await download(ctx, id) as Partial<AppState>
    const remote = normalize({ ...raw, current: local.current })
    const m = mergeStates(local, remote); state = m.state; added = m.added; updated = m.updated
  }
  await upload(ctx, id, payload(state))
  return { state, added, updated, remoteChanged: added + updated > 0 }
}

/* ---------- Google Identity Services ---------- */
type TokenResp = { access_token?: string; expires_in?: number; error?: string }
interface TokenClient { requestAccessToken: (o?: { prompt?: string }) => void; callback: (r: TokenResp) => void; error_callback?: (e: unknown) => void }
declare global { interface Window { google?: { accounts: { oauth2: { initTokenClient: (c: Record<string, unknown>) => TokenClient; revoke: (t: string, cb?: () => void) => void } } } } }

let gisPromise: Promise<void> | null = null
const loadGis = () => gisPromise ??= new Promise<void>((res, rej) => {
  if (window.google?.accounts?.oauth2) return res()
  const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true
  s.onload = () => res(); s.onerror = () => { gisPromise = null; rej(new Error('GIS ni dosegljiv')) }
  document.head.appendChild(s)
})

export const envClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''
const LS = 'hs3d-gsync'
export interface SyncPrefs { clientId: string; signedIn: boolean; lastSync: string | null }
export const loadPrefs = (): SyncPrefs => { try { return { clientId: '', signedIn: false, lastSync: null, ...JSON.parse(localStorage.getItem(LS) ?? '{}') } } catch { return { clientId: '', signedIn: false, lastSync: null } } }
export const savePrefs = (p: SyncPrefs) => localStorage.setItem(LS, JSON.stringify(p))
export const effectiveClientId = (p: SyncPrefs) => (p.clientId || envClientId).trim()

let token: { value: string; exp: number } | null = null
let client: TokenClient | null = null, clientFor = ''

/** pridobi žeton; prompt '' = tiho (brez okna, če je dovoljenje že dano) */
export async function requestToken(clientId: string, prompt: '' | 'consent' | 'select_account' = ''): Promise<string> {
  await loadGis()
  if (!client || clientFor !== clientId) { client = window.google!.accounts.oauth2.initTokenClient({ client_id: clientId, scope: SCOPE, callback: () => {} }); clientFor = clientId }
  return new Promise((res, rej) => {
    client!.callback = (r) => { if (r.error || !r.access_token) return rej(new AuthError()); token = { value: r.access_token, exp: Date.now() + ((r.expires_in ?? 3600) - 60) * 1000 }; res(r.access_token) }
    client!.error_callback = () => rej(new AuthError())
    client!.requestAccessToken({ prompt })
  })
}
export const tokenGetter = (clientId: string) => async (force = false) =>
  !force && token && token.exp > Date.now() ? token.value : requestToken(clientId, '')
export const hasValidToken = () => !!token && token.exp > Date.now()
export function signOut() { if (token && window.google) window.google.accounts.oauth2.revoke(token.value); token = null }
