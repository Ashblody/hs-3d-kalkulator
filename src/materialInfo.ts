/**
 * Kratke kartice materialov (Podroben + Nastavitve). Ena kartica na izdelek, več id-jev materiala lahko kaže nanjo.
 * Številke (šoba, podlaga, komora, sušenje, kaljena šoba) so iz vira v `vir` (preverjeno 17. 11. 2026); česar vir ne navaja, ni vpisano.
 * Uporaba / prednosti / slabosti: kratko, previdno (pri Trčku povzeto po njihovi strani).
 */
export interface MaterialInfo {
  uporaba: string[]; prednosti: string[]; slabosti: string[]
  soba?: string; podlaga?: string; komora?: string; susenje?: string; kaljena?: 'da' | 'ne'
  vir: string
}

const BBW = 'https://wiki.bambulab.com/en/general/filament-guide-material-table (šoba, podlaga, kaljena) + https://wiki.bambulab.com/en/filament-acc/filament/dry-filament (sušenje v pečici)'
const PM = 'https://prusament.com/materials/'
const TR = 'https://3dtrcek.com/sl/'

const PLA = { uporaba: ['Prototipi, makete, okrasni in notranji deli', 'Hitri, enostavni tiski'], prednosti: ['Najlažji za tisk, malo se zvija', 'Lepa površina in natančnost', 'Ne potrebuje zaprte komore'], slabosti: ['Mehča se že pri okoli 55–60 °C (avto, sonce)', 'Bolj krhek kot PETG/ASA', 'Ni za zunanjo uporabo'] }
const PETG = { uporaba: ['Funkcionalni deli, držala, ohišja', 'Deli za vlago in zunaj (z omejitvami)'], prednosti: ['Žilav, manj krhek kot PLA', 'Dobra oprijemnost med plastmi', 'Ne potrebuje zaprte komore'], slabosti: ['Rad vleče nitke (stringing)', 'Lahko se premočno prime na gladek PEI', 'Manj temperaturno obstojen kot ASA/ABS'] }
const ASA = { uporaba: ['Zunanji deli (sonce, dež)', 'Deli za avto in tehnične izdelke'], prednosti: ['Odporen na UV in vremenske vplive', 'Boljša temperaturna obstojnost kot PLA/PETG', 'Gladi se z acetonom'], slabosti: ['Zvija se – priporočena zaprta komora', 'Med tiskom smrdi – prezračevanje', 'Težji za tisk kot PLA/PETG'] }
const ABS = { uporaba: ['Ohišja, tehnični in notranji deli', 'Deli, ki prenesejo toploto'], prednosti: ['Žilav in temperaturno obstojen', 'Gladi se z acetonom', 'Dober za brušenje in lepljenje'], slabosti: ['Zvija se – priporočena zaprta komora', 'Med tiskom smrdi – prezračevanje', 'Na soncu porumeni (ni UV odporen)'] }
const PC = { uporaba: ['Zelo obremenjeni tehnični deli', 'Deli pri višjih temperaturah'], prednosti: ['Zelo trden in žilav', 'Visoka temperaturna obstojnost'], slabosti: ['Zahteven za tisk: visoke temperature, zvijanje', 'Potrebna zaprta komora in sušenje', 'Dražji'] }
const NYLON = { uporaba: ['Zobniki, puše, drsni in tehnični deli'], prednosti: ['Zelo žilav in obstojen na obrabo', 'Dobra kemična obstojnost'], slabosti: ['Močno vpija vlago – obvezno sušenje', 'Zvija se, potrebna zaprta komora'] }

const INFO: Record<string, MaterialInfo> = {
  // Bambu Lab
  'bb-pla': { ...PLA, soba: '190–240 °C', podlaga: '35–65 °C', komora: 'odpri vrata, če je podlaga nad 45 °C', susenje: '50 °C, 8 h', kaljena: 'ne', vir: BBW },
  'bb-petghf': { ...PETG, soba: '230–260 °C', podlaga: '60–80 °C', komora: 'odpri vrata, če je podlaga nad 60 °C', susenje: '60–65 °C, 8 h', kaljena: 'ne', vir: BBW },
  'bb-petg': { ...PETG, soba: '240–270 °C', podlaga: '60–80 °C', komora: 'odpri vrata, če je podlaga nad 60 °C', susenje: '60–65 °C, 8 h', kaljena: 'ne', vir: BBW },
  'bb-asa': { ...ASA, soba: '240–280 °C', podlaga: '90–100 °C', susenje: '75–85 °C, 8 h', kaljena: 'ne', vir: BBW },
  'bb-abs': { ...ABS, soba: '240–280 °C', podlaga: '90–100 °C', susenje: '75–85 °C, 8 h', kaljena: 'ne', vir: BBW },
  'bb-pc': { ...PC, soba: '260–290 °C', podlaga: '100–120 °C', susenje: '75–85 °C, 8 h', kaljena: 'ne', vir: BBW },
  'bb-pa6cf': { uporaba: ['Togi tehnični deli, nosilci, deli za drone'], prednosti: ['Zelo tog in trden (ogljikova vlakna)', 'Visoka temperaturna obstojnost', 'Mat površina'], slabosti: ['Obvezna kaljena šoba', 'Močno vpija vlago – obvezno sušenje', 'Dražji'], soba: '260–300 °C', podlaga: '90–110 °C', susenje: '75–85 °C, 8–12 h', kaljena: 'da', vir: BBW },
  // Prusament
  'pm-pla': { ...PLA, soba: '210 ± 10 °C', podlaga: '40–60 °C', komora: 'ni potrebna', kaljena: 'ne', vir: PM + 'pla/' },
  'pm-petg': { ...PETG, soba: '250 ± 10 °C', podlaga: '80 ± 10 °C', komora: 'ni potrebna', kaljena: 'ne', vir: PM + 'prusament-petg/' },
  'pm-asa': { ...ASA, soba: '260 ± 5 °C', podlaga: '110 ± 5 °C', komora: 'priporočena (ali skirt)', kaljena: 'ne', vir: PM + 'prusament-asa/' },
  'pm-pc': { ...PC, soba: '275 ± 10 °C', podlaga: '110 ± 10 °C', komora: 'priporočena (ali skirt)', kaljena: 'ne', vir: PM + 'prusament-pc-blend/' },
  'pm-pa11': { ...NYLON, soba: '275 ± 10 °C', podlaga: '100 ± 10 °C', komora: 'obvezna, 55 ± 5 °C', susenje: '90 °C, 6–8 h', kaljena: 'ne', vir: PM + 'prusament-pa11/' },
  'pm-petgcf': { uporaba: ['Togi funkcionalni deli z mat videzom'], prednosti: ['Bolj tog in dimenzijsko stabilen kot PETG', 'Manj vleče nitke, lepa mat površina'], slabosti: ['Obvezna kaljena šoba', 'Manj žilav kot navaden PETG', 'Ni za drobne dele'], soba: '265 ± 10 °C', podlaga: '90 ± 10 °C', kaljena: 'da', vir: PM + 'prusament-petg-carbon-fiber/' },
  // Plastika Trček (povzeto po njihovih straneh)
  'tr-pla': { ...PLA, soba: '195–225 °C', podlaga: '40–60 °C', komora: 'ne ogrevaj (odprta vrata)', susenje: '50 °C, 2–4 h', kaljena: 'ne', vir: TR + 'pla-filament' },
  'tr-petg': { ...PETG, soba: '230–260 °C', podlaga: '65–80 °C', komora: 'ogrevana ni priporočljiva', susenje: '60 °C, 2–4 h', kaljena: 'ne', vir: TR + 'petg-filament' },
  'tr-asaplus': { uporaba: ['Zunanji deli, izpostavljeni soncu', 'Mehansko obremenjeni deli', 'Deli v stiku z olji in maščobami'], prednosti: ['UV in vremensko odporen', 'Manj se zvija in lažji za tisk kot navaden ASA', 'Ne deformira se do 96 °C', 'Gladi se z acetonom'], slabosti: ['Med tiskom sprošča neprijetne pline – prezračevanje ali filter', 'Priporočena zaprta komora ali ograda', 'Vpija vlago – po daljšem stanju sušenje'], soba: '230–260 °C (240 °C, 1. plast 270 °C)', podlaga: '80–100 °C (95 °C)', komora: 'priporočena, ni nujna', susenje: '60 °C, 4–8 h', vir: TR + 'asa-plus-filament' },
  'tr-abs': { ...ABS, soba: '240–260 °C (1. plast 260 °C)', podlaga: '80–100 °C (95 °C)', komora: 'priporočena', susenje: '60 °C, 4–8 h', vir: TR + 'abs-plus-filament' },
  'tr-pc': { ...PC, soba: '280–300 °C', podlaga: '110 °C', vir: TR + 'pc-filament' },
  'tr-pa12': { ...NYLON, soba: '240–270 °C (260 °C)', podlaga: '80–110 °C (100 °C)', komora: 'zaprta obvezna, ogrevana priporočena', susenje: '80 °C, 8–12 h', vir: TR + 'nylon-pa-12-filament' },
  'tr-pctg': { uporaba: ['Funkcionalni deli namesto PETG', 'Prozorni in žilavi deli'], prednosti: ['Žilav, odporen na udarce', 'Malo se zvija, ne potrebuje zaprte komore', 'Brez vonja, malo hlapov'], slabosti: ['Vpija vlago – sušenje pred uporabo', 'Dražji od PETG'], soba: '240–280 °C', podlaga: '80–110 °C', komora: 'ni potrebna', susenje: '65 °C, 4 h', kaljena: 'ne', vir: TR + 'pctg-filament' },
  'tr-tpu': { uporaba: ['Mehki, elastični deli: tesnila, zaščite, podloge'], prednosti: ['Elastičen in žilav', 'Dober oprijem in blaženje udarcev'], slabosti: ['Tiskati počasi', 'Zahtevnejši za podajanje (AMS)', 'Vpija vlago'], soba: '230–250 °C (240 °C)', podlaga: '30–50 °C (35 °C)', susenje: '50 °C, 6 h', vir: TR + 'tpu-filament' },
  'tr-pcabs': { uporaba: ['Ohišja elektronike in gospodinjskih aparatov', 'Deli za notranjost avtomobila', 'Deli, kjer je potrebna negorljivost'], prednosti: ['Negorljiv: UL94 V-0 pri 1,2 mm, brez halogenov', 'Visoka udarna žilavost, tudi v mrazu', 'Temperaturno obstojen (Vicat 101 °C)'], slabosti: ['Hitro vpija vlago – sušenje pred vsakim tiskom', 'Potrebna zaprta komora in polnokovinska šoba', 'Dražji'], soba: '260–285 °C (začni pri 270 °C)', podlaga: '95–110 °C', komora: '50–70 °C, močno priporočena', susenje: '65 °C, 4–6 h', kaljena: 'ne', vir: TR + 'pc-abs-v0-filament' },
  'tr-asacf': { uporaba: ['Togi zunanji deli', 'Avtomobilizem, droni, funkcionalni deli na soncu'], prednosti: ['UV in vremensko odporen', 'Zelo tog in dimenzijsko stabilen (ogljikova vlakna)', 'Mat črna površina'], slabosti: ['Obvezna kaljena šoba (priporočeno 0,6 mm)', 'Bolj krhek (raztezek 2 %)', 'Sušenje pred uporabo'], soba: '245–285 °C (začni pri 260 °C)', podlaga: '90–110 °C', komora: 'okoli 65 °C priporočeno', susenje: '65–70 °C, 2–4 h', kaljena: 'da', vir: TR + 'asa-carbon-fibre-filament' },
}

/** id materiala → kartica (lastni materiali uporabnika nimajo kartice) */
const BY_ID: Record<string, string> = {
  'bambu-pla': 'bb-pla', 'bb2-pla': 'bb-pla', 'bambu-petg': 'bb-petghf', 'bb2-petghf': 'bb-petghf', 'bb2-petgb': 'bb-petg',
  'bambu-asa': 'bb-asa', 'bb2-asa': 'bb-asa', 'bb2-abs': 'bb-abs', 'bb2-pc': 'bb-pc', 'bb2-pa6cf': 'bb-pa6cf',
  'pm-pla': 'pm-pla', 'pm2-pla': 'pm-pla', 'pm-petg': 'pm-petg', 'pm2-petg': 'pm-petg', 'pm2-petg2': 'pm-petg', 'pm-asa': 'pm-asa', 'pm2-asa': 'pm-asa',
  'pm-pc': 'pm-pc', 'pm2-pc': 'pm-pc', 'pm2-pa11': 'pm-pa11', 'pm-petgcf': 'pm-petgcf',
  'trcek-pla': 'tr-pla', 'tr2-pla': 'tr-pla', 'tr2-pla5': 'tr-pla', 'trcek-petg': 'tr-petg', 'tr2-petg': 'tr-petg', 'tr2-petg10': 'tr-petg',
  'tr2-asa': 'tr-asaplus', 'tr3-asaplus': 'tr-asaplus', 'tr2-abs': 'tr-abs', 'tr2-pc': 'tr-pc', 'tr2-pa12': 'tr-pa12', 'tr2-pctg': 'tr-pctg',
  'trcek-tpu': 'tr-tpu', 'tr2-pcabs': 'tr-pcabs', 'tr2-asacf': 'tr-asacf',
}
export const materialInfo = (id: string | undefined): MaterialInfo | undefined => (id && BY_ID[id] ? INFO[BY_ID[id]] : undefined)
