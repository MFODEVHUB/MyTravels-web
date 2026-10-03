import { CONTINENTS, TERRITORIES } from './territories'
import type { AppState } from './types'

export interface ContinentStat {
  continent: string
  visited: number
  total: number
}

export interface Stats {
  visitedCountries: number
  wishlistCountries: number
  totalCountries: number
  /** Îles et territoires visités (hors décompte "pays"). */
  visitedTerritories: number
  worldPercent: number
  byContinent: ContinentStat[]
}

/** Seules les entrées de type COUNTRY comptent dans les stats "pays", comme côté Android. */
export function computeStats(state: AppState): Stats {
  let visited = 0
  let wishlist = 0
  let total = 0
  let visitedTerritories = 0
  const perContinent = new Map<string, ContinentStat>(
    CONTINENTS.map((c) => [c, { continent: c, visited: 0, total: 0 }]),
  )

  for (const t of TERRITORIES) {
    const status = state.countries[t.code]?.status ?? 'NONE'
    if (t.type !== 'COUNTRY') {
      if (status === 'VISITED') visitedTerritories++
      continue
    }
    total++
    const stat = perContinent.get(t.continent)
    if (stat) stat.total++
    if (status === 'VISITED') {
      visited++
      if (stat) stat.visited++
    } else if (status === 'WISHLIST') wishlist++
  }

  return {
    visitedCountries: visited,
    wishlistCountries: wishlist,
    totalCountries: total,
    visitedTerritories,
    worldPercent: total === 0 ? 0 : Math.round((visited / total) * 100),
    byContinent: [...perContinent.values()].filter((c) => c.total > 0),
  }
}

// ── Page Stats ───────────────────────────────────────────────────────────────

/** Mêmes continents et même ordre que l'écran Stats de l'app Android (l'Antarctique compte dans le total des pays, pas ici). */
export const STATS_CONTINENTS = ['AF', 'NA', 'SA', 'AS', 'EU', 'OC'] as const

/** Régions suivies et leur nombre total (vérifié par les tests contre les fichiers de la carte). */
export const REGION_COUNTRIES = [
  { code: 'US', total: 50 },
  { code: 'GR', total: 14 },
  { code: 'MA', total: 16 },
] as const

export interface ContinentDetail {
  code: string
  visited: number
  wishlist: number
  total: number
  /** Pays visités / à visiter de ce continent. */
  visitedCodes: string[]
  wishlistCodes: string[]
}

export interface RegionProgress {
  code: string
  visited: number
  wishlist: number
  total: number
}

export interface DetailedStats {
  visited: number
  wishlist: number
  total: number
  percent: number
  continents: ContinentDetail[]
  /** Continents où au moins un pays est visité, et nombre de continents suivis. */
  continentsVisited: number
  continentsTotal: number
  topContinent: string | null
  regions: RegionProgress[]
  cities: { visited: number; wishlist: number }
}

const percentOf = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100))

export function computeDetailedStats(state: AppState): DetailedStats {
  const statusOf = (code: string) => state.countries[code]?.status ?? 'NONE'
  const countries = TERRITORIES.filter((t) => t.type === 'COUNTRY')

  const continents = STATS_CONTINENTS.map((code): ContinentDetail => {
    const inContinent = countries.filter((t) => t.continent === code)
    const visitedCodes = inContinent.filter((t) => statusOf(t.code) === 'VISITED').map((t) => t.code)
    const wishlistCodes = inContinent.filter((t) => statusOf(t.code) === 'WISHLIST').map((t) => t.code)
    return { code, visited: visitedCodes.length, wishlist: wishlistCodes.length, total: inContinent.length, visitedCodes, wishlistCodes }
  })

  // Le premier continent au maximum l'emporte, comme `maxByOrNull` côté Android.
  let top: ContinentDetail | null = null
  for (const c of continents) if (c.visited > 0 && (!top || c.visited > top.visited)) top = c

  const visited = countries.filter((t) => statusOf(t.code) === 'VISITED').length
  const wishlist = countries.filter((t) => statusOf(t.code) === 'WISHLIST').length

  const regions = REGION_COUNTRIES.map(({ code, total }): RegionProgress => {
    const mine = state.regions.filter((r) => r.code.startsWith(`${code}-`))
    return {
      code,
      total,
      visited: mine.filter((r) => r.status === 'VISITED').length,
      wishlist: mine.filter((r) => r.status === 'WISHLIST').length,
    }
  })

  return {
    visited,
    wishlist,
    total: countries.length,
    percent: percentOf(visited, countries.length),
    continents,
    continentsVisited: continents.filter((c) => c.visited > 0).length,
    continentsTotal: continents.length,
    topContinent: top?.code ?? null,
    regions,
    cities: {
      visited: state.cities.filter((c) => c.status === 'VISITED').length,
      wishlist: state.cities.filter((c) => c.status === 'WISHLIST').length,
    },
  }
}

export { percentOf }
