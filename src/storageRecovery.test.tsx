// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { initialState, usePersistentState } from './store'

const key = 'hs3d-kalkulator-v1'
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear() })

describe('zaščita shranjenih podatkov', () => {
  it('ne prepiše neberljivega izvirnega zapisa', async () => {
    const original = '{ neveljaven JSON'
    localStorage.setItem(key, original)
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    const { result } = renderHook(() => usePersistentState())
    expect(result.current[2]?.original).toBe(original)
    act(() => result.current[1](s => ({ ...s, dark: !s.dark })))
    await waitFor(() => expect(localStorage.getItem(key)).toBe(original))
    expect(spy).not.toHaveBeenCalled()
  })
  it('ob neuspešnem zapisu opozori in ohrani prejšnji zapis', async () => {
    const previous = JSON.stringify(initialState())
    localStorage.setItem(key, previous)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    const { result } = renderHook(() => usePersistentState())
    await waitFor(() => expect(result.current[2]?.message).toContain('Shranjevanje'))
    expect(localStorage.getItem(key)).toBe(previous)
  })
})
