import { useEffect, useState } from 'react'

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: BIP | null = null
if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as BIP })

/** Kratek namig za namestitev PWA na telefon / računalnik */
export default function InstallHint() {
  const [can, setCan] = useState(!!deferred)
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone)
  useEffect(() => { const h = (e: Event) => { e.preventDefault(); deferred = e as BIP; setCan(true) }; window.addEventListener('beforeinstallprompt', h); return () => window.removeEventListener('beforeinstallprompt', h) }, [])
  return (
    <div className="card mb-4" data-testid="namesti">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-semibold mr-auto">Namesti aplikacijo</span>
        {standalone ? <span className="text-sm text-emerald-600">Nameščeno ✓</span>
          : can && <button className="btn-p" onClick={async () => { await deferred?.prompt(); deferred = null; setCan(false) }}>Namesti</button>}
      </div>
      <p className="text-xs text-slate-500 mt-2">Android (Chrome): meni ⋮ → <b>Dodaj na začetni zaslon / Namesti aplikacijo</b>. iPhone (Safari): Deli → <b>Dodaj na domači zaslon</b>. Računalnik (Chrome/Edge): ikona za namestitev v naslovni vrstici. Deluje tudi brez povezave; podatki ostanejo na napravi.</p>
    </div>
  )
}
