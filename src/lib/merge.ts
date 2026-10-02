import { emptyState, type AppState, type CityEntry, type CountryRecord, type RegionEntry } from './types'

/** Date de modification d'un élément ; absente (données d'avant la synchronisation ou d'Android) = la plus ancienne. */
const stamp = (rec: { updatedAt?: number } | undefined) => rec?.updatedAt ?? 0

const cityKey = (c: CityEntry) => `${c.countryCode}|${c.name}`

/**
 * Fusion de deux états : pour chaque pays ou région, la modification la plus récente gagne (en cas d'égalité,
 * l'état local). Commutative sauf égalité exacte, idempotente : la rejouer ne change rien, ce qui permet de
 * resynchroniser sans risque. Les suppressions sont des éléments NONE datés, qui l'emportent comme le reste.
 */
export function mergeStates(local: AppState, remote: AppState): AppState {
  const merged = emptyState()

  for (const code of new Set([...Object.keys(local.countries), ...Object.keys(remote.countries)])) {
    const a = local.countries[code]
    const b = remote.countries[code]
    merged.countries[code] = (!a ? b : !b ? a : stamp(b) > stamp(a) ? b : a) as CountryRecord
  }

  const regions = new Map<string, RegionEntry>()
  for (const r of remote.regions) regions.set(r.code, r)
  for (const r of local.regions) {
    const other = regions.get(r.code)
    if (!other || stamp(other) <= stamp(r)) regions.set(r.code, r)
  }
  merged.regions = [...regions.values()].sort((x, y) => x.code.localeCompare(y.code))

  // Les villes ne sont pas encore modifiables sur le web : union, l'état local l'emporte en cas de conflit.
  const cities = new Map<string, CityEntry>()
  for (const c of remote.cities) cities.set(cityKey(c), c)
  for (const c of local.cities) cities.set(cityKey(c), c)
  merged.cities = [...cities.values()]

  return merged
}

const effective = (r: CountryRecord | undefined) => `${r?.status ?? 'NONE'}|${r?.visitedAt ?? ''}`

export interface Diff {
  /** Pays dont le statut ou la date de visite diffère entre les deux états. */
  countries: number
  regions: number
  cities: number
}

/** Ce que `after` change par rapport à `before`, pour afficher « 3 pays récupérés ». */
export function diffStates(before: AppState, after: AppState): Diff {
  let countries = 0
  for (const code of new Set([...Object.keys(before.countries), ...Object.keys(after.countries)])) {
    if (effective(before.countries[code]) !== effective(after.countries[code])) countries++
  }
  const status = (list: RegionEntry[]) => new Map(list.map((r) => [r.code, r.status === 'NONE' ? '' : r.status]))
  const b = status(before.regions)
  const a = status(after.regions)
  let regions = 0
  for (const code of new Set([...b.keys(), ...a.keys()])) if ((b.get(code) ?? '') !== (a.get(code) ?? '')) regions++
  const known = new Set(before.cities.map(cityKey))
  return { countries, regions, cities: after.cities.filter((c) => !known.has(cityKey(c))).length }
}

/** Égalité stricte, dates comprises : sert à savoir s'il y a quelque chose à envoyer. */
export function statesEqual(a: AppState, b: AppState): boolean {
  const norm = (s: AppState) =>
    JSON.stringify([
      Object.entries(s.countries).sort(([x], [y]) => x.localeCompare(y)),
      [...s.regions].sort((x, y) => x.code.localeCompare(y.code)),
      s.cities.map(cityKey).sort(),
    ])
  return norm(a) === norm(b)
}

export type ImportMode = 'merge' | 'replace'

/**
 * Applique une sauvegarde importée. Les éléments sans date (sauvegarde Android) sont datés de l'import : c'est un
 * geste volontaire de l'utilisateur, il l'emporte sur l'existant. « Remplacer » transforme en suppressions datées
 * tout ce que la sauvegarde ne contient pas, pour que les autres appareils synchronisés l'apprennent aussi.
 */
export function applyImport(local: AppState, imported: AppState, mode: ImportMode, now: number): AppState {
  const stamped: AppState = {
    countries: Object.fromEntries(
      Object.entries(imported.countries).map(([code, r]) => [code, { ...r, updatedAt: r.updatedAt ?? now }]),
    ),
    regions: imported.regions.map((r) => ({ ...r, updatedAt: r.updatedAt ?? now })),
    cities: imported.cities,
  }
  if (mode === 'merge') return mergeStates(local, stamped)

  const base: AppState = { countries: { ...local.countries }, regions: [...local.regions], cities: stamped.cities }
  for (const [code, r] of Object.entries(local.countries)) {
    if (r.status !== 'NONE' && !stamped.countries[code]) base.countries[code] = { status: 'NONE', updatedAt: now }
  }
  const inImport = new Set(stamped.regions.map((r) => r.code))
  base.regions = local.regions.map((r) =>
    r.status !== 'NONE' && !inImport.has(r.code) ? { code: r.code, status: 'NONE', updatedAt: now } : r,
  )
  const result = mergeStates(base, stamped)
  result.cities = stamped.cities
  return result
}
