import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BackupError, exportBackup, parseBackup, sanitizeState } from './backup'
import { emptyState } from './types'

describe('parseBackup', () => {
  it('lit un backup v1 (pays et villes, sans régions)', () => {
    const state = parseBackup(
      JSON.stringify({
        version: 1,
        countries: [{ code: 'FR', status: 'VISITED' }, { code: 'JP', status: 'WISHLIST' }],
        cities: [{ countryCode: 'FR', name: 'Paris', status: 'VISITED' }],
      }),
    )
    expect(state.countries).toEqual({ FR: { status: 'VISITED' }, JP: { status: 'WISHLIST' } })
    expect(state.cities).toHaveLength(1)
    expect(state.regions).toEqual([])
  })

  it('traite l’absence de version comme une v1', () => {
    expect(parseBackup(JSON.stringify({ countries: [{ code: 'FR', status: 'VISITED' }], cities: [] })).countries.FR).toBeDefined()
  })

  it('lit un backup v3 avec date de visite et régions, et ignore les régions NONE', () => {
    const state = parseBackup(
      JSON.stringify({
        version: 3,
        countries: [{ code: 'IT', status: 'VISITED', visitedAt: 1_700_000_000_000 }],
        cities: [],
        regions: [{ code: 'US-CA', status: 'VISITED' }, { code: 'US-NY', status: 'NONE' }],
      }),
    )
    expect(state.countries.IT).toEqual({ status: 'VISITED', visitedAt: 1_700_000_000_000 })
    expect(state.regions).toEqual([{ code: 'US-CA', status: 'VISITED' }])
  })

  it('ignore les codes inconnus et ramène les statuts inconnus à NONE (ex. ancien "LIVED")', () => {
    const state = parseBackup(
      JSON.stringify({
        version: 3,
        countries: [{ code: 'ZZ', status: 'VISITED' }, { code: 'ES', status: 'LIVED' }, { code: 'PT', status: 'VISITED' }],
        cities: [],
      }),
    )
    expect(Object.keys(state.countries)).toEqual(['PT'])
  })

  it('rejette un JSON invalide, un mauvais format et une version future', () => {
    expect(() => parseBackup('pas du json')).toThrowError(new BackupError('invalid-json'))
    expect(() => parseBackup('{"hello":1}')).toThrowError(new BackupError('invalid-format'))
    expect(() => parseBackup('{"version":99,"countries":[]}')).toThrowError(new BackupError('unsupported-version'))
  })

  it('lit un vrai fichier exporté par l’app Android (stress_test_backup.json), si présent', () => {
    let text: string
    try {
      text = readFileSync('../MyTravels/stress_test_backup.json', 'utf8')
    } catch {
      return
    }
    const state = parseBackup(text)
    expect(Object.keys(state.countries).length).toBeGreaterThan(0)
  })
})

describe('exportBackup', () => {
  it('produit un backup v3 relisible à l’identique', () => {
    const state = emptyState()
    state.countries.FR = { status: 'VISITED', visitedAt: 1_650_000_000_000 }
    state.countries.JP = { status: 'WISHLIST' }
    state.cities = [{ countryCode: 'FR', name: 'Lyon', status: 'VISITED' }]
    state.regions = [{ code: 'GR-I', status: 'VISITED' }]

    const exported = JSON.parse(exportBackup(state))
    expect(exported.version).toBe(3)
    expect(exported.countries.find((c: { code: string }) => c.code === 'FR')).toEqual({
      code: 'FR',
      status: 'VISITED',
      visitedAt: 1_650_000_000_000,
    })
    expect(exported.countries.find((c: { code: string }) => c.code === 'DE')).toEqual({ code: 'DE', status: 'NONE' })

    expect(parseBackup(exportBackup(state))).toEqual(state)
  })
})

describe('sanitizeState', () => {
  it('survit à des données corrompues', () => {
    expect(sanitizeState(null)).toEqual(emptyState())
    expect(sanitizeState({ countries: { FR: 'x', ZZ: { status: 'VISITED' }, DE: { status: 'VISITED' } } }).countries).toEqual({
      DE: { status: 'VISITED' },
    })
  })
})
