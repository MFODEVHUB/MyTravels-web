// Génère src/data/territories.json et src/data/iso-n2a.json à partir des sources Kotlin de l'app Android,
// et copie la carte TopoJSON. Usage : node scripts/generate-data.mjs [chemin/vers/MyTravels]
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.argv[2] ?? '../MyTravels')
const kt = (p) => readFileSync(resolve(root, 'app/src/main/java/com/mfodevhub/mytravels/data', p), 'utf8')

const flagFromIso = (code) =>
  /^[A-Z]{2}$/.test(code)
    ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : ''

const str = '"((?:[^"\\\\]|\\\\.)*)"'
const seedRe = new RegExp(
  `CountrySeed\\(\\s*"([A-Z]+)",\\s*${str},\\s*${str},\\s*"([A-Z]{2})"` +
    `(?:,\\s*"([^"]*)")?(?:,\\s*flagEmoji\\s*=\\s*"([^"]*)")?(?:,\\s*type\\s*=\\s*TerritoryType\\.(\\w+))?\\s*\\)`,
  'g',
)
const unescape = (s) => s.replace(/\\(.)/g, '$1')

const source = kt('CountryData.kt').replace(/\/\/.*$/gm, '')
const territories = []
for (const m of source.matchAll(seedRe)) {
  const [, code, nameEn, nameFr, continent, flagPos, flagNamed, type] = m
  territories.push({
    code,
    nameEn: unescape(nameEn),
    nameFr: unescape(nameFr),
    continent,
    flag: flagPos || flagNamed || flagFromIso(code),
    type: type ?? 'COUNTRY',
  })
}
const declared = (source.match(/CountrySeed\("/g) ?? []).length
if (declared !== territories.length) {
  throw new Error(`Parsing incomplet : ${territories.length} entrées lues sur ${declared} déclarées`)
}
const codes = new Set(territories.map((t) => t.code))
if (codes.size !== territories.length) throw new Error('Codes en double dans CountryData.kt')

const n2aSource = readFileSync(resolve(root, 'app/src/main/java/com/mfodevhub/mytravels/data/geo/CountryPath.kt'), 'utf8')
const block = n2aSource.slice(n2aSource.indexOf('val ISO_N2A'), n2aSource.indexOf('\n)\n', n2aSource.indexOf('val ISO_N2A')))
const n2a = {}
for (const m of block.replace(/\/\/.*$/gm, '').matchAll(/(\d+)\s+to\s+"([A-Z]+)"/g)) n2a[m[1]] = m[2]

writeFileSync('src/data/territories.json', JSON.stringify(territories, null, 1) + '\n')
writeFileSync('src/data/iso-n2a.json', JSON.stringify(n2a) + '\n')
for (const f of ['countries-50m.json', 'uk-nations.json', 'dom-islands.geojson']) {
  copyFileSync(resolve(root, 'app/src/main/assets/map', f), `public/map/${f}`)
}
// Régions (US, GR, MA) : déjà projetées dans l'espace carte 1000 × 792.
for (const f of ['us_states.json', 'greece_regions.json', 'morocco_regions.json']) {
  copyFileSync(resolve(root, 'app/src/main/assets', f), `public/map/${f}`)
}
console.log(`${territories.length} territoires, ${Object.keys(n2a).length} codes numériques ISO`)
