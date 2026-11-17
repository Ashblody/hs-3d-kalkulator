// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { initialState, normalize } from './store'
import ProjectsView from './ProjectsView'

describe('potek projekta', () => {
  it('stari projekt ima neznano stanje in omogoča vnos stanja brez vpliva na izračun', () => {
    cleanup()
    const state = initialState(), project = state.projects[0], update = vi.fn()
    render(<ProjectsView projects={[project]} currentId={null} onOpen={() => {}} onCopy={() => {}} onDelete={() => {}} onStatus={() => {}} onActual={() => {}} onTracking={update} onPdf={() => {}} onExport={() => {}} />)
    const scan = screen.getByLabelText('3D-sken') as HTMLSelectElement
    expect(scan.value).toBe('unknown')
    fireEvent.change(scan, { target: { value: 'doing' } })
    expect(update).toHaveBeenCalledWith(project, { stages: { scan: 'doing' } })
  })
  it('podatki o poteku ostanejo v varnostni kopiji', () => {
    const state = initialState()
    state.projects[0].tracking = { code: '0003', notes: 'testni komplet', links: 'https://example.com/model', stages: { cad: 'doing' } }
    const restored = normalize(JSON.parse(JSON.stringify(state)))
    expect(restored.projects[0].tracking).toEqual(state.projects[0].tracking)
  })
})
