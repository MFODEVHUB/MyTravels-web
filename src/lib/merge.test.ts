import { describe, expect, it } from 'vitest'
import { applyImport, diffStates, mergeStates, statesEqual } from './merge'
import { emptyState, type AppState } from './types'

const state = (p: Partial<AppState>): AppState => ({ ...emptyState(), ...p })

describe('mergeStates', () => {
  it('garde la modification la plus récente de chaque pays', () => {
    const local = state({ countries: { FR: { status: 'VISITED', updatedAt: 200 }, JP: { status: 'WISHLIST', updatedAt: 100 } } })
    const remote = state({ countries: { FR: { status: 'WISHLIST', updatedAt: 100 }, JP: { status: 'VISITED', updatedAt: 300 } } })
    const merged = mergeStates(local, remote)
    expect(merged.countries.FR.status).toBe('VISITED')
    expect(merged.countries.JP.status).toBe('VISITED')
  })

  it('réunit les éléments présents d’un seul côté', () => {
    const merged = mergeStates(
      state({ countries: { FR: { status: 'VISITED', updatedAt: 1 } } }),
      state({ countries: { DE: { status: 'VISITED', updatedAt: 1 } } }),
    )
    expect(Object.keys(merged.countries).sort()).toEqual(['DE', 'FR'])
  })

  it('propage une suppression (NONE daté) au lieu de ressusciter le pays', () => {
    const local = state({ countries: { FR: { status: 'NONE', updatedAt: 500 } } })
    const remote = state({ countries: { FR: { status: 'VISITED', updatedAt: 100 } } })
    expect(mergeStates(local, remote).countries.FR.status).toBe('NONE')
    expect(mergeStates(remote, local).countries.FR.status).toBe('NONE')
  })

  it('traite l’absence de date comme la plus ancienne et garde le local en cas d’égalité', () => {
    const undated = state({ countries: { FR: { status: 'VISITED' } } })
    const dated = state({ countries: { FR: { status: 'WISHLIST', updatedAt: 1 } } })
    expect(mergeStates(undated, dated).countries.FR.status).toBe('WISHLIST')
    const tieLocal = state({ countries: { FR: { status: 'VISITED', updatedAt: 5 } } })
    const tieRemote = state({ countries: { FR: { status: 'WISHLIST', updatedAt: 5 } } })
    expect(mergeStates(tieLocal, tieRemote).countries.FR.status).toBe('VISITED')
  })

  it('fusionne les régions par code, triées', () => {
    const merged = mergeStates(
      state({ regions: [{ code: 'US-TX', status: 'VISITED', updatedAt: 10 }] }),
      state({ regions: [{ code: 'US-TX', status: 'NONE', updatedAt: 20 }, { code: 'US-CA', status: 'VISITED', updatedAt: 1 }] }),
    )
    expect(merged.regions).toEqual([
      { code: 'US-CA', status: 'VISITED', updatedAt: 1 },
      { code: 'US-TX', status: 'NONE', updatedAt: 20 },
    ])
  })

  it('réunit les villes sans doublon', () => {
    const merged = mergeStates(
      state({ cities: [{ countryCode: 'FR', name: 'Paris', status: 'VISITED' }] }),
      state({ cities: [{ countryCode: 'FR', name: 'Paris', status: 'VISITED' }, { countryCode: 'FR', name: 'Lyon', status: 'VISITED' }] }),
    )
    expect(merged.cities).toHaveLength(2)
  })

  it('est idempotente et ne dépend pas de l’ordre', () => {
    const a = state({ countries: { FR: { status: 'VISITED', updatedAt: 3 } }, regions: [{ code: 'US-CA', status: 'VISITED', updatedAt: 3 }] })
    const b = state({ countries: { FR: { status: 'WISHLIST', updatedAt: 9 }, DE: { status: 'VISITED', updatedAt: 1 } } })
    const ab = mergeStates(a, b)
    expect(statesEqual(mergeStates(ab, b), ab)).toBe(true)
    expect(statesEqual(mergeStates(b, a), ab)).toBe(true)
  })
})

describe('diffStates', () => {
  it('compte ce qui change, suppressions comprises, sans compter les simples changements de date', () => {
    const before = state({ countries: { FR: { status: 'VISITED', updatedAt: 1 }, JP: { status: 'VISITED', updatedAt: 1 } } })
    const after = state({
      countries: { FR: { status: 'VISITED', updatedAt: 99 }, JP: { status: 'NONE', updatedAt: 99 }, DE: { status: 'VISITED', updatedAt: 99 } },
      regions: [{ code: 'US-CA', status: 'VISITED', updatedAt: 99 }],
    })
    expect(diffStates(before, after)).toEqual({ countries: 2, regions: 1, cities: 0 })
  })
})

describe('applyImport', () => {
  const local = state({
    countries: { FR: { status: 'VISITED', updatedAt: 100 }, JP: { status: 'VISITED', updatedAt: 100 } },
    regions: [{ code: 'US-TX', status: 'VISITED', updatedAt: 100 }],
  })
  const androidBackup = state({ countries: { FR: { status: 'WISHLIST' }, DE: { status: 'VISITED' } } })

  it('fusionner : garde l’existant, ajoute l’import et date les éléments sans date', () => {
    const result = applyImport(local, androidBackup, 'merge', 1000)
    expect(result.countries.JP.status).toBe('VISITED')
    expect(result.countries.DE).toEqual({ status: 'VISITED', updatedAt: 1000 })
    expect(result.countries.FR).toEqual({ status: 'WISHLIST', updatedAt: 1000 })
    expect(result.regions).toHaveLength(1)
  })

  it('remplacer : ce que l’import ne contient pas devient une suppression datée', () => {
    const result = applyImport(local, androidBackup, 'replace', 1000)
    expect(result.countries.JP).toEqual({ status: 'NONE', updatedAt: 1000 })
    expect(result.countries.DE.status).toBe('VISITED')
    expect(result.regions).toEqual([{ code: 'US-TX', status: 'NONE', updatedAt: 1000 }])
  })

  it('remplacer par du vide efface tout, de façon propagée', () => {
    const result = applyImport(local, emptyState(), 'replace', 2000)
    expect(Object.values(result.countries).every((r) => r.status === 'NONE' && r.updatedAt === 2000)).toBe(true)
    expect(result.regions[0].status).toBe('NONE')
  })

  it('conserve les dates d’une sauvegarde web (fusion identique à la synchronisation)', () => {
    const webBackup = state({ countries: { FR: { status: 'WISHLIST', updatedAt: 50 } } })
    expect(applyImport(local, webBackup, 'merge', 1000).countries.FR.status).toBe('VISITED')
  })
})
