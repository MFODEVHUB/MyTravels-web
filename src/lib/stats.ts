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
