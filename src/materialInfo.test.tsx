// @vitest-environment jsdom
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any
import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { materialInfo } from './materialInfo'
import { defaultSettings, materialsV2 } from './seed'
import { pricePerKg } from './calc'
import MaterialInfoCard from './MaterialInfoCard'

describe('Kartice materialov', () => {
  it('vsak vgrajen material ima kartico z 2–4 alinejami in virom', () => {
    for (const m of defaultSettings().materials) {
      const i = materialInfo(m.id); expect(i, m.id).toBeTruthy()
      for (const k of ['uporaba', 'prednosti', 'slabosti'] as const) { expect(i![k].length, `${m.id} ${k}`).toBeGreaterThanOrEqual(1); expect(i![k].length).toBeLessThanOrEqual(4) }
      expect(i!.vir).toMatch(/^https:\/\//)
    }
  })
  it('lastni material nima kartice', () => { expect(materialInfo('abc123')).toBeUndefined(); cleanup(); const r = render(<MaterialInfoCard id="abc123" />); expect(r.container.innerHTML).toBe('') })
  it('Trček ASA Plus: 21,90 € redna, 12,05 € akcija, 800 g', () => {
    const m = materialsV2.find((x) => x.id === 'tr3-asaplus')!
    expect([m.name, m.spoolG, m.prices.map((p) => p.price)]).toEqual(['Trček ASA Plus (800 g)', 800, [21.9, 12.05]]); expect(pricePerKg(m)).toBeCloseTo(27.375, 3)
  })
  it('kartica je zaprta, odpre se ob kliku; manjkajoče vrednosti so –', () => {
    cleanup(); render(<MaterialInfoCard id="tr2-pc" />)
    const d = screen.getByTestId('material-info') as HTMLDetailsElement
    expect(d.open).toBe(false); fireEvent.click(screen.getByText('ⓘ Več o materialu')); d.open = true
    expect(d.textContent).toContain('280–300 °C'); expect(d.textContent).toMatch(/Sušenje:\s*–/)
  })
})
