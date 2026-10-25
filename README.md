# HS 3D Kalkulator

Kalkulator cen za 3D-tisk, 3D-skeniranje, CAD-modeliranje in prodajo digitalnih modelov.
Deluje v brskalniku, brez prijave, podatki ostanejo na tvoji napravi (localStorage).

**Aplikacija:** https://ashblody.github.io/hs-3d-kalkulator/

## Namestitev na telefon ali računalnik (PWA)

- **Android (Chrome):** odpri povezavo → meni ⋮ → *Namesti aplikacijo* / *Dodaj na začetni zaslon*.
- **Windows (Chrome ali Edge):** odpri povezavo → ikona *Namesti* v naslovni vrstici (ali meni → *Aplikacije* → *Namesti*).
- Po prvem odprtju kalkulator deluje tudi brez interneta.

## Uporaba

- **Kalkulator:** izberi način (Stranka / Prijatelj / Zase), vnesi tisk in ure storitev. Oranžna polja spreminjaš, rezultati se izračunajo takoj.
- **Projekti:** shrani, kopiraj, spremeni status, beleži dejansko porabo. Vsak projekt hrani svoj posnetek cenika.
- **Posel:** mesečni pregled prihodkov, stroškov in ali dosegaš ciljno postavko.
- **Nastavitve:** cenik storitev, tiskalniki, materiali (več nabavnih cen), davki in DDV, varnostna kopija (JSON).

## Formule

```
Material      = poraba filamenta [kg] × cena [€/kg]   (cena/kg = cena koluta / neto masa)
Elektrika     = čas tiska [h] × moč [kW] × cena [€/kWh]
Amortizacija  = čas tiska [h] × (nabavna cena + servis) / življenjska doba [h]
Stroški tiska = (material + elektrika + amortizacija + potrošni + ostali neposredni) × (1 + rezerva)
Prodaja tiska = stroški tiska × (1 + pribitek)      (50 % pribitka = 33,33 % marže)
Končna cena   = prodaja tiska + storitve + prevoz + pakiranje + dostava + ostalo − popust (najmanj minimalno naročilo)
Zaslužek      = prihodek brez DDV − dejanski stroški − delež fiksnih stroškov − ocena davka
```

Skupen čas serije se ne množi s številom kosov. Prijateljski popust velja samo za storitve.

## Razvoj

```bash
npm install
npm run dev      # razvojni strežnik
npm test         # samodejni testi formul (Vitest)
npm run build    # produkcijska različica v dist/
```

Ob vsakem pushu na `main` GitHub Actions zažene teste, zgradi aplikacijo in jo objavi na GitHub Pages
(Settings → Pages → Source: *GitHub Actions*).

Tehnologija: React, TypeScript, Vite, Tailwind CSS, Recharts, vite-plugin-pwa.

### Opomba o avtomatski objavi

Workflow je pripravljen v `ci/deploy.yml`. Ker trenutni žeton nima pravice `workflow`, ga premakni v
`.github/workflows/deploy.yml` (to lahko narediš kar na github.com) in v Settings → Pages izberi *GitHub Actions*.
Do takrat se aplikacija objavlja ročno z `npm run deploy` (veja `gh-pages`).
