// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import SlicerImport from './SlicerImportPanel'
import { defaultSettings } from './seed'

describe('uvoz v plošče', () => {
  it('zahteva pregled pred dodajanjem in ohrani skupni čas', async () => {
    cleanup()
    const add = vi.fn(), materials = defaultSettings().materials
    render(<SlicerImport materials={materials} materialId={materials[0].id} onAdd={add} />)
    const file = new File([''], 'test.gcode')
    Object.defineProperty(file, 'text', { value: async () => '; estimated printing time (normal mode) = 1h 2m\n; filament used [g] = 24.5' })
    fireEvent.change(screen.getByLabelText('Izberi G-kodo'), { target: { files: [file] } })
    const button = await screen.findByText('Dodaj kot novo ploščo') as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(screen.getByLabelText('Preveril sem čas, maso in izbrani material.'))
    expect(button.disabled).toBe(false)
    fireEvent.click(button)
    await waitFor(() => expect(add).toHaveBeenCalledWith({ hours: 1, minutes: 2, grams: 24.5, materialId: materials[0].id }))
  })
})
