import { useEffect, useState, type ReactNode } from 'react'
import { num, parseNum } from './format'
import { BARE_PRINT, describeDuration, formatClock, parseDuration } from './duration'

export function NumField({ label, value, onChange, suffix, min = 0, step }: { label: string; value: number; onChange: (v: number) => void; suffix?: string; min?: number; step?: string }) {
  const [text, setText] = useState(num(value))
  const [focus, setFocus] = useState(false)
  useEffect(() => { if (!focus) setText(num(value)) }, [value, focus])
  const v = parseNum(text)
  const bad = text.trim() !== '' && (!/^-?[\d\s.,]+$/.test(text.trim()) || v < min)
  return (
    <label className="block">
      <span className="lbl">{label}</span>
      <div className="relative">
        <input className={`inp ${bad ? '!border-red-500' : ''} ${suffix ? 'pr-12' : ''}`} inputMode="decimal" value={text} data-step={step}
          onFocus={(e) => { setFocus(true); e.target.select() }}
          onBlur={() => setFocus(false)}
          onChange={(e) => { setText(e.target.value); const n = parseNum(e.target.value); if (n >= min) onChange(n) }} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{suffix}</span>}
      </div>
      {bad && <span className="text-xs text-red-500">Vnesi število ≥ {min}</span>}
    </label>
  )
}

export function TextField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <label className="block"><span className="lbl">{label}</span><input className="inp" type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>
}

export function Select<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <label className="block"><span className="lbl">{label}</span>
      <select className="inp" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  )
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 py-1"><input type="checkbox" className="h-5 w-5 accent-orange-500" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>
}

export function Section({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="card" open={open}>
      <summary className="cursor-pointer select-none font-semibold text-slate-800 dark:text-slate-100">{title}</summary>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>
    </details>
  )
}

export function Big({ label, value, sub, tone = 'blue' }: { label: string; value: string; sub?: string; tone?: 'blue' | 'green' | 'slate' | 'red' }) {
  const c = { blue: 'text-sky-600 dark:text-sky-400', green: 'text-emerald-600 dark:text-emerald-400', slate: 'text-slate-800 dark:text-slate-100', red: 'text-red-600 dark:text-red-400' }[tone]
  return (
    <div className="card">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${c}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

export function Row({ l, v, strong }: { l: string; v: string; strong?: boolean }) {
  return <div className={`flex justify-between py-1 text-sm ${strong ? 'font-semibold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 mt-1 pt-2' : 'text-slate-600 dark:text-slate-300'}`}><span>{l}</span><span className="tabular-nums">{v}</span></div>
}

/** Čas v enem polju: 1:30 · 1,5 · 90m · 2h 15m · 1d 2h. `minutes` = vrednost v minutah. */
export function TimeField({ label, minutes, onChange, bareFrom = BARE_PRINT }: { label: string; minutes: number; onChange: (min: number) => void; bareFrom?: number }) {
  const [text, setText] = useState(formatClock(minutes))
  const [focus, setFocus] = useState(false)
  useEffect(() => { if (!focus) setText(formatClock(minutes)) }, [minutes, focus])
  const parsed = parseDuration(text, bareFrom)
  const bad = parsed === null
  return (
    <label className="block">
      <span className="lbl">{label}</span>
      <input className={`inp ${bad ? '!border-red-500' : ''}`} inputMode="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="1:30" value={text} aria-label={label}
        onFocus={(e) => { setFocus(true); e.target.select() }}
        onBlur={() => setFocus(false)}
        onChange={(e) => { setText(e.target.value); const v = parseDuration(e.target.value, bareFrom); if (v !== null) onChange(v) }} />
      {bad ? <span className="text-xs text-red-500">Napiši npr. 1:30, 1,5, 90m ali 2h 15m</span>
        : focus && <span className="text-xs text-slate-500" data-testid="time-hint">= {describeDuration(parsed)}</span>}
    </label>
  )
}
/** isto, vrednost v urah (decimalno) */
export function HoursField({ label, hours, onChange, bareFrom }: { label: string; hours: number; onChange: (h: number) => void; bareFrom?: number }) {
  return <TimeField label={label} minutes={hours * 60} bareFrom={bareFrom} onChange={(m) => onChange(m / 60)} />
}
