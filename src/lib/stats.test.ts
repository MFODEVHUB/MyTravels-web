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
