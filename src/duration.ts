/** Vnos trajanja: 1:30 · 1,5 · 90m · 2h 15m · 1d 2h · 1h30 · gola cela števila (glej bareFrom). Vrne minute ali null. */
export const BARE_PRINT = 60 // gola cela števila ≥ 60 so minute (90 → 1:30), manjša ure (2 → 2:00)
export const BARE_WORK = 12 // pri delu: 30 → 30 min, 2 → 2 h

export function parseDuration(input: string, bareFrom = BARE_PRINT): number | null {
  const s = input.trim().toLowerCase().replace(',', '.').replace(/\s+/g, ' ')
  if (s === '') return 0
  let m = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/)
  if (m) return Number(m[1]) * 60 + Number(m[2]) + (m[3] ? Number(m[3]) / 60 : 0)
  m = s.match(/^\d*\.?\d+$/)
  if (m) { const n = Number(s); return s.includes('.') ? n * 60 : n >= bareFrom ? n : n * 60 }
  // enote: d/h/m/s (tudi dan, ur, ura, min, minut, sek); gola številka za h = minute, za d = ure
  const re = /(\d*\.?\d+)\s*(dni|dan|d|ur[aei]?|h|minut[ae]?|min|m|sekund[ae]?|sek|s)?\s*/y
  let total = 0, pos = 0, prev: 'd' | 'h' | 'm' | 's' | null = null, any = false
  while (pos < s.length) {
    re.lastIndex = pos
    const t = re.exec(s); if (!t) return null
    pos = re.lastIndex; any = true
    const n = Number(t[1]); const u = t[2]
    let k: 'd' | 'h' | 'm' | 's'
    if (u) k = /^d/.test(u) ? 'd' : /^(ur|h)/.test(u) ? 'h' : /^(minut|min|m$)/.test(u) ? 'm' : 's'
    else if (prev === 'd') k = 'h'; else if (prev === 'h') k = 'm'; else if (prev === 'm') k = 's'; else return null
    total += k === 'd' ? n * 1440 : k === 'h' ? n * 60 : k === 'm' ? n : n / 60
    prev = k
  }
  return any ? total : null
}

const r = (x: number) => Math.round(x)
/** 90 → "1 h 30 min", 1500 → "1 d 1 h" */
export function describeDuration(min: number): string {
  const t = r(min); if (t <= 0) return '0 min'
  const d = Math.floor(t / 1440), h = Math.floor((t % 1440) / 60), mm = t % 60
  return [d ? `${d} d` : '', h ? `${h} h` : '', mm ? `${mm} min` : ''].filter(Boolean).join(' ')
}
/** kanonični zapis h:mm */
export const formatClock = (min: number) => { const t = r(min); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` }
