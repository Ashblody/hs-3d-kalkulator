import { describe, expect, it } from 'vitest'
import { BARE_WORK, describeDuration, formatClock, parseDuration as p } from './duration'

describe('vnos trajanja', () => {
  it.each([
    ['1:30', 90], ['0:45', 45], ['15:15', 915], ['1:30:30', 90.5],
    ['1,5', 90], ['1.5', 90], ['0,25', 15],
    ['90m', 90], ['90 min', 90], ['45 minut', 45], ['2h', 120], ['2 uri', 120], ['2h 15m', 135], ['2h15m', 135], ['2 h 15 min', 135],
    ['1h30', 90], ['1d 2h', 1560], ['1d 2h 15m 30s', 1575.5], ['1d2', 1560],
    ['2', 120], ['90', 90], ['60', 60], ['', 0],
  ])('%s → %d min', (t, m) => expect(p(t)).toBeCloseTo(m, 5))
  it('gola števila pri delu: 30 = minute, 2 = ure', () => { expect(p('30', BARE_WORK)).toBe(30); expect(p('2', BARE_WORK)).toBe(120); expect(p('11', BARE_WORK)).toBe(660) })
  it.each(['abc', '1:', '1h x', 'h', '1:2:3:4', '2x'])('neveljavno: %s', (t) => expect(p(t)).toBeNull())
  it('opis in zapis', () => {
    expect(describeDuration(90)).toBe('1 h 30 min'); expect(describeDuration(45)).toBe('45 min'); expect(describeDuration(120)).toBe('2 h'); expect(describeDuration(1500)).toBe('1 d 1 h'); expect(describeDuration(0)).toBe('0 min')
    expect(formatClock(90)).toBe('1:30'); expect(formatClock(5)).toBe('0:05'); expect(formatClock(915)).toBe('15:15')
  })
})
