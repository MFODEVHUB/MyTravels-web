import { geoArea, geoMercator, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry, MultiPolygon } from 'geojson'
import type { Topology, GeometryCollection } from 'topojson-specification'
import n2a from '../data/iso-n2a.json'
import { parseRegions, REGION_FILES, type RegionData } from './regions'
import { TERRITORY_BY_CODE } from './territories'

/** Même espace de coordonnées que l'app Android (CountryPath.kt) : 1000 × 792, latitudes [-75°, 84°]. */
export const MAP_W = 1000
export const MAP_H = 792
export const LAT_MAX = 84
export const LAT_MIN = -75

const mercY = (latDeg: number) => Math.log(Math.tan(Math.PI / 4 + (latDeg * Math.PI) / 360))

export function createProjection() {
  const scale = MAP_W / (2 * Math.PI)
  return geoMercator()
    .scale(scale)
    .translate([MAP_W / 2, scale * mercY(LAT_MAX)])
    .clipExtent([
      [0, 0],
      [MAP_W, MAP_H],
    ])
}

/**
 * Points d'ancrage des noms, au centre visuel du territoire principal (reprise de LABEL_OVERRIDES côté
 * Android) : évite que l'outre-mer, les îles lointaines ou les extrémités étroites déportent l'étiquette.
 */
const LABEL_OVERRIDES: Record<string, [number, number]> = {
  ENG: [497, 300], SCT: [489, 276], WLS: [490, 298], NIR: [482, 288],
  FR: [506, 326], ES: [489, 347], PT: [478, 350], NO: [528, 241], DK: [526, 281], IT: [536, 341],
  HR: [547, 327], GR: [561, 351], TR: [597, 351], RU: [722, 260],
  US: [233, 351], CA: [236, 300], MX: [219, 404], CL: [303, 573], EC: [283, 475],
  AU: [875, 541], NZ: [986, 583], MY: [783, 458], ID: [833, 475], JP: [883, 361], PH: [839, 436], FJ: [994, 521],
}

export interface MapShape {
  code: string
  path: Path2D
  /** Boîte englobante en unités carte. */
  bounds: [[number, number], [number, number]]
  centroid: [number, number]
  /** Point d'ancrage du nom. */
  labelPoint: [number, number]
  /** false = dessiné mais non sélectionnable (pas d'entrée dans la liste, ex. Sahara occidental). */
  selectable: boolean
}

export interface RegionShape extends RegionData {
  path: Path2D
}

export interface WorldMap {
  countries: MapShape[]
  regions: RegionShape[]
}

const N2A = n2a as Record<string, string>

/** Les ids du TopoJSON sont des chaînes zéro-paddées ("076" pour le Brésil) ; la table ISO est indexée par entier. */
export const codeForFeatureId = (id: string | number | undefined): string | undefined => {
  const n = Number(id)
  return Number.isInteger(n) ? N2A[String(n)] : undefined
}

/** Géométrie remplacée par des entrées dédiées : le Royaume-Uni est découpé en 4 nations. */
const REPLACED = new Set(['GB'])

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return (await res.json()) as T
}

type CodedFeature = Feature<Geometry, { code: string }>

/** Plus grand polygone d'un MultiPolygon (le "continent"), pour ancrer le nom sur la masse principale. */
function mainLand(f: CodedFeature): Feature<Geometry> {
  if (f.geometry.type !== 'MultiPolygon') return f
  let best: number[][][] | undefined
  let bestArea = -1
  for (const polygon of (f.geometry as MultiPolygon).coordinates) {
    const area = geoArea({ type: 'Polygon', coordinates: polygon })
    if (area > bestArea) {
      bestArea = area
      best = polygon
    }
  }
  return best ? { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: best } } : f
}

function toShapes(features: CodedFeature[]): MapShape[] {
  const path = geoPath(createProjection())
  const shapes: MapShape[] = []
  for (const f of features) {
    const d = path(f)
    if (!d) continue
    const code = f.properties.code
    const centroid = path.centroid(f)
    const anchor = LABEL_OVERRIDES[code] ?? path.centroid(mainLand(f))
    shapes.push({
      code,
      path: new Path2D(d),
      bounds: path.bounds(f),
      centroid,
      labelPoint: anchor.every(Number.isFinite) ? anchor : centroid,
      selectable: TERRITORY_BY_CODE.has(code),
    })
  }
  return shapes
}

export async function loadMap(base = import.meta.env.BASE_URL): Promise<WorldMap> {
  const [topo, uk, dom, ...regionFiles] = await Promise.all([
    fetchJson<Topology>(`${base}map/countries-50m.json`),
    fetchJson<FeatureCollection<Geometry, { iso: string }>>(`${base}map/uk-nations.json`),
    fetchJson<FeatureCollection<Geometry, { iso: string }>>(`${base}map/dom-islands.geojson`),
    ...REGION_FILES.map((f) => fetchJson<unknown>(`${base}map/${f}`)),
  ])

  const countries = feature(topo, topo.objects.countries as GeometryCollection)
  const coded: CodedFeature[] = []
  for (const f of countries.features) {
    const code = codeForFeatureId(f.id)
    if (code && !REPLACED.has(code)) coded.push({ ...f, properties: { code } } as CodedFeature)
  }
  for (const f of [...uk.features, ...dom.features]) {
    coded.push({ ...f, properties: { code: f.properties.iso } } as CodedFeature)
  }

  return {
    countries: toShapes(coded),
    regions: regionFiles.flatMap(parseRegions).map((r) => ({ ...r, path: new Path2D(r.svg) })),
  }
}
