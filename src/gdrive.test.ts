import { describe, it, expect, vi } from 'vitest'
vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
import { initialState, newProject } from './store'
import { syncOnce, FILE_NAME, AuthError, type DriveCtx } from './gdrive'
import { mergeStates } from './backup'
import { demoJob } from './seed'

/** lažni Drive: hrani eno datoteko v appDataFolder */
function fakeDrive(initial?: unknown, opts: { expireFirst?: boolean; alwaysAuthFail?: boolean } = {}) {
  let file: { id: string; body: string } | null = initial ? { id: 'f1', body: JSON.stringify(initial) } : null
  const calls: string[] = []; let tokens = 0
  const f = vi.fn(async (url: string, init: RequestInit = {}) => {
    const auth = (init.headers as Record<string, string>).Authorization
    calls.push(`${init.method ?? 'GET'} ${url.split('?')[0]}`)
    if (opts.alwaysAuthFail || (opts.expireFirst && auth === 'Bearer t1')) return new Response('', { status: 401 })
    if (url.startsWith('https://www.googleapis.com/drive/v3/files?')) {
      expect(url).toContain('spaces=appDataFolder'); expect(decodeURIComponent(url)).toContain(FILE_NAME)
      return Response.json({ files: file ? [{ id: file.id }] : [] })
    }
    if (url.includes('alt=media')) return new Response(file!.body)
    if (init.method === 'PATCH') { file!.body = String(init.body); return Response.json({ id: file!.id }) }
    if (init.method === 'POST') {
      const b = String(init.body); expect(b).toContain('"parents":["appDataFolder"]')
      file = { id: 'new1', body: b.split('\r\n\r\n')[2].split('\r\n--')[0] }; return Response.json({ id: 'new1' })
    }
    return new Response('', { status: 404 })
  })
  const ctx: DriveCtx = { fetch: f as unknown as typeof fetch, getToken: async (force) => { if (force || !tokens) tokens++; return `t${tokens}` } }
  return { ctx, calls, get file() { return file }, get tokens() { return tokens } }
}

describe('Google Drive sinhronizacija', () => {
  it('prvič: ustvari hs3d-kopija.json v appDataFolder', async () => {
    const d = fakeDrive(); const s = initialState()
    const r = await syncOnce(s, d.ctx)
    expect(r.remoteChanged).toBe(false)
    expect(d.calls.some((c) => c.startsWith('POST'))).toBe(true)
    expect(JSON.parse(d.file!.body).projects.length).toBe(s.projects.length)
  })
  it('pull + merge (novejši zmaga) + push', async () => {
    const local = initialState()
    const remote = structuredClone(local)
    const extra = newProject(demoJob(), local.settings)
    remote.projects.push(extra)
    remote.projects[0] = { ...remote.projects[0], status: 'placano', updatedAt: '2999-01-01T00:00:00Z' }
    const d = fakeDrive(remote)
    const r = await syncOnce(local, d.ctx)
    expect(r.added).toBe(1); expect(r.updated).toBe(1)
    expect(r.state.projects.find((p) => p.id === local.projects[0].id)!.status).toBe('placano')
    expect(d.calls.some((c) => c.startsWith('PATCH'))).toBe(true)
    expect(JSON.parse(d.file!.body).projects.length).toBe(2)
    expect(r.state.current).toEqual(local.current) // osnutek ostane lokalni
  })
  it('izbrisan projekt se ne vrne iz oblaka', async () => {
    const local = initialState(); const remote = structuredClone(local)
    const del = { ...local, projects: [], deleted: [local.projects[0].id] }
    const r = await syncOnce(del, fakeDrive(remote).ctx)
    expect(r.state.projects.length).toBe(0)
    expect(mergeStates(remote, r.state).state.projects.length).toBe(0)
  })
  it('potekel žeton: tiha ponovna zahteva in ponovni poskus', async () => {
    const d = fakeDrive(undefined, { expireFirst: true })
    await syncOnce(initialState(), d.ctx)
    expect(d.tokens).toBe(2)
  })
  it('trajna napaka prijave → AuthError', async () => {
    await expect(syncOnce(initialState(), fakeDrive(undefined, { alwaysAuthFail: true }).ctx)).rejects.toBeInstanceOf(AuthError)
  })
  it('brez povezave → napaka fetch (offline), lokalni podatki nedotaknjeni', async () => {
    const s = initialState(); const before = JSON.stringify(s)
    const ctx: DriveCtx = { fetch: (async () => { throw new TypeError('Failed to fetch') }) as unknown as typeof fetch, getToken: async () => 't' }
    await expect(syncOnce(s, ctx)).rejects.toBeInstanceOf(TypeError)
    expect(JSON.stringify(s)).toBe(before)
  })
})
