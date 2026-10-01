import { describe, expect, it } from 'vitest'
import n2a from '../data/iso-n2a.json'
import { readFileSync } from 'node:fs'
import { codeForFeatureId, createProjection, MAP_H, MAP_W } from './geo'
import { TERRITORY_BY_CODE } from './territories'

describe('projection', () => {
  const projection = createProjection()

  it('reproduit l’espace de coordonnées de l’app Android (1000 × 792)', () => {
    const [x0, y0] = projection([-180, 84])!
    const [x1, y1] = projection([180, -75])!
    expect(x0).toBeCloseTo(0, 1)
    expect(y0).toBeCloseTo(0, 1)
    expect(x1).toBeCloseTo(MAP_W, 1)
    expect(y1).toBeCloseTo(MAP_H, 0)
  })
})

describe('données', () => {
  it('seuls GB (remplacé par 4 nations) et EH (décor non sélectionnable) n’ont pas d’entrée dans la liste', () => {
    const unknown = Object.values(n2a as Record<string, string>).filter((c) => !TERRITORY_BY_CODE.has(c))
    expect(unknown.sort()).toEqual(['EH', 'GB'])
  })
})

describe('codeForFeatureId', () => {
  it('gère les ids zéro-paddés du TopoJSON', () => {
    expect(codeForFeatureId('076')).toBe('BR')
    expect(codeForFeatureId('036')).toBe('AU')
    expect(codeForFeatureId('250')).toBe('FR')
    expect(codeForFeatureId(undefined)).toBeUndefined()
    expect(codeForFeatureId('abc')).toBeUndefined()
  })

  it('reconnaît (presque) toutes les entités de la vraie carte 50m', () => {
    const topo = JSON.parse(readFileSync('public/map/countries-50m.json', 'utf8'))
    const geoms: { id?: string }[] = topo.objects.countries.geometries
    const mapped = new Set(geoms.map((g) => codeForFeatureId(g.id)).filter(Boolean))
    for (const code of ['BR', 'AU', 'AR', 'AT', 'BE', 'DZ', 'AF']) expect(mapped.has(code)).toBe(true)
    const unmapped = geoms.filter((g) => !codeForFeatureId(g.id)).length
    expect(unmapped).toBeLessThan(10)
  })
})
