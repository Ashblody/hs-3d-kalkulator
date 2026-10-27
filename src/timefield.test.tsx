// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { TimeField } from './ui'

function Wrap({ init }: { init: { hours: number; minutes: number } }) {
  const [v, setV] = useState(init)
  return <><TimeField label="Čas kosa" minutes={v.hours * 60 + v.minutes} onChange={(t) => setV({ hours: Math.floor(t / 60), minutes: t % 60 })} /><output data-testid="o">{v.hours}|{v.minutes}</output></>
}
describe('TimeField', () => {
  it('obstoječi podatki se prikažejo kot h:mm, vnos 2h 15m shrani 2|15, namig', () => {
    render(<Wrap init={{ hours: 1, minutes: 30 }} />)
    const i = screen.getByLabelText('Čas kosa') as HTMLInputElement
    expect(i.value).toBe('1:30')
    fireEvent.focus(i); fireEvent.change(i, { target: { value: '2h 15m' } })
    expect(screen.getByTestId('o').textContent).toBe('2|15')
    expect(screen.getByTestId('time-hint').textContent).toBe('= 2 h 15 min')
    fireEvent.change(i, { target: { value: '90m' } }); expect(screen.getByTestId('o').textContent).toBe('1|30')
    fireEvent.blur(i); expect(i.value).toBe('1:30')
  })
})
