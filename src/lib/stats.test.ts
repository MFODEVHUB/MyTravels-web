import { describe, expect, it } from 'vitest'
import { computeStats } from './stats'
import { TERRITORIES } from './territories'
import { emptyState } from './types'

describe('computeStats', () => {
  it('compte uniquement les entrées COUNTRY dans les stats pays', () => {
    const state = emptyState()
    state.countries.FR = { status: 'VISITED' }
    state.countries.JP = { status: 'WISHLIST' }
    state.countries.RE = { status: 'VISITED' } // île : hors décompte pays

    const stats = computeStats(state)
    expect(stats.visitedCountries).toBe(1)
    expect(stats.wishlistCountries).toBe(1)
    expect(stats.visitedTerritories).toBe(1)
    expect(stats.totalCountries).toBe(TERRITORIES.filter((t) => t.type === 'COUNTRY').length)
    expect(stats.byContinent.find((c) => c.continent === 'EU')?.visited).toBe(1)
  })

  it('arrondit le pourcentage du monde', () => {
    const state = emptyState()
    for (const t of TERRITORIES.filter((t) => t.type === 'COUNTRY').slice(0, 20)) {
      state.countries[t.code] = { status: 'VISITED' }
    }
    const stats = computeStats(state)
    expect(stats.worldPercent).toBe(Math.round((20 / stats.totalCountries) * 100))
  })
})

import { computeDetailedStats, REGION_COUNTRIES, STATS_CONTINENTS } from './stats'
import { readFileSync } from 'node:fs'
import { parseRegions } from './regions'

describe('computeDetailedStats', () => {
  it('compte pays, pourcentage et continents comme l’app Android', () => {
    const state = emptyState()
    state.countries.FR = { status: 'VISITED' }
    state.countries.DE = { status: 'VISITED' }
    state.countries.JP = { status: 'WISHLIST' }
    state.countries.BR = { status: 'VISITED' }
    state.countries.RE = { status: 'VISITED' } // île : hors décompte pays

    const s = computeDetailedStats(state)
    expect(s.visited).toBe(3)
    expect(s.wishlist).toBe(1)
    expect(s.percent).toBe(Math.round((3 / s.total) * 100))
    expect(s.continents.map((c) => c.code)).toEqual([...STATS_CONTINENTS])
    expect(s.continentsVisited).toBe(2) // Europe + Amérique du Sud
    expect(s.continentsTotal).toBe(6)
    const eu = s.continents.find((c) => c.code === 'EU')!
    expect(eu.visitedCodes.sort()).toEqual(['DE', 'FR'])
    expect(s.continents.find((c) => c.code === 'AS')!.wishlistCodes).toEqual(['JP'])
  })

  it('désigne le continent le plus visité, le premier en cas d’égalité', () => {
    const state = emptyState()
    state.countries.FR = { status: 'VISITED' }
    state.countries.BR = { status: 'VISITED' }
    expect(computeDetailedStats(state).topContinent).toBe('SA') // SA précède EU dans l'ordre Android
    state.countries.DE = { status: 'VISITED' }
    expect(computeDetailedStats(state).topContinent).toBe('EU')
    expect(computeDetailedStats(emptyState()).topContinent).toBeNull()
  })

  it('ne compte pas l’Antarctique dans les continents, mais dans le total des pays', () => {
    const state = emptyState()
    state.countries.AQ = { status: 'VISITED' }
    const s = computeDetailedStats(state)
    expect(s.visited).toBe(1)
    expect(s.continentsVisited).toBe(0)
  })

  it('ignore les suppressions datées (NONE) et suit les régions par pays', () => {
    const state = emptyState()
    state.countries.FR = { status: 'NONE', updatedAt: 5 }
    state.regions = [
      { code: 'US-CA', status: 'VISITED' },
      { code: 'US-TX', status: 'WISHLIST' },
      { code: 'US-NY', status: 'NONE', updatedAt: 9 },
      { code: 'GR-I', status: 'VISITED' },
    ]
    state.cities = [
      { countryCode: 'FR', name: 'Lyon', status: 'VISITED' },
      { countryCode: 'JP', name: 'Kyoto', status: 'WISHLIST' },
    ]
    const s = computeDetailedStats(state)
    expect(s.visited).toBe(0)
    expect(s.regions.find((r) => r.code === 'US')).toMatchObject({ visited: 1, wishlist: 1, total: 50 })
    expect(s.regions.find((r) => r.code === 'GR')).toMatchObject({ visited: 1, wishlist: 0, total: 14 })
    expect(s.cities).toEqual({ visited: 1, wishlist: 1 })
  })

  it('REGION_COUNTRIES correspond aux fichiers de régions de la carte', () => {
    const files = { US: 'us_states.json', GR: 'greece_regions.json', MA: 'morocco_regions.json' } as const
    for (const { code, total } of REGION_COUNTRIES) {
      const count = parseRegions(JSON.parse(readFileSync(`public/map/${files[code]}`, 'utf8'))).length
      expect(count).toBe(total)
    }
  })
})
