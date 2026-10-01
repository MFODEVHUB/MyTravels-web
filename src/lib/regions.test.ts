import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseRegions, REGION_FILES } from './regions'
import { TERRITORY_BY_CODE } from './territories'

const load = (f: string) => parseRegions(JSON.parse(readFileSync(`public/map/${f}`, 'utf8')))

describe('parseRegions', () => {
  it('lit les 50 États, 14 régions grecques et 16 régions marocaines', () => {
    expect(load('us_states.json')).toHaveLength(50)
    expect(load('greece_regions.json')).toHaveLength(14)
    expect(load('morocco_regions.json')).toHaveLength(16)
  })

  it('rattache chaque région à un pays connu, avec des codes uniques', () => {
    const all = REGION_FILES.flatMap(load)
    expect(new Set(all.map((r) => r.code)).size).toBe(all.length)
    for (const r of all) expect(TERRITORY_BY_CODE.has(r.countryCode)).toBe(true)
    expect(all.find((r) => r.code === 'US-CA')?.countryCode).toBe('US')
  })

  it('garde contours, boîte et point d’ancrage dans l’espace carte 1000 × 792 (Alaska déborde de l’antiméridien)', () => {
    for (const r of REGION_FILES.flatMap(load)) {
      expect(r.svg.startsWith('M') && r.svg.endsWith('Z')).toBe(true)
      expect(r.bounds[0][0]).toBeGreaterThanOrEqual(r.code === 'US-AK' ? -30 : 0)
      expect(r.bounds[1][0]).toBeLessThanOrEqual(1000)
      expect(r.bounds[1][1]).toBeLessThanOrEqual(792)
      expect(r.labelPoint[0]).toBeGreaterThan(r.bounds[0][0] - 1)
      expect(r.labelPoint[0]).toBeLessThan(r.bounds[1][0] + 1)
      expect(r.labelPoint[1]).toBeGreaterThan(r.bounds[0][1] - 1)
      expect(r.labelPoint[1]).toBeLessThan(r.bounds[1][1] + 1)
    }
  })

  it('ignore les entrées invalides', () => {
    expect(parseRegions(null)).toEqual([])
    expect(parseRegions([{ code: 'X-1' }, { code: 'X-2', paths: [[[0, 0]]] }, 3])).toEqual([])
  })
})
