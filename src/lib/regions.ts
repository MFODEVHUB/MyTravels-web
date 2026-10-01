/** Fichiers de régions de l'app Android : [{ code, nameEn, nameFr, paths: [[[x, y], …], …] }], déjà projetés en 1000 × 792. */
export const REGION_FILES = ['us_states.json', 'greece_regions.json', 'morocco_regions.json'] as const

export interface RegionData {
  /** Code ISO 3166-2, ex. "US-CA". */
  code: string
  /** Code pays parent, ex. "US". */
  countryCode: string
  nameEn: string
  nameFr: string
  /** Contours au format SVG, prêts pour `new Path2D(svg)`. */
  svg: string
  bounds: [[number, number], [number, number]]
  /** Point d'ancrage du nom : centroïde du plus grand contour. */
  labelPoint: [number, number]
}

type Ring = [number, number][]

const isRing = (v: unknown): v is Ring =>
  Array.isArray(v) && v.length >= 3 && v.every((p) => Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number')

/** Aire signée et centroïde d'un polygone (formule du lacet), comme `areaCentroid` côté Android. */
function ringCentroid(ring: Ring): { area: number; centroid: [number, number] } {
  let area = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < ring.length; i++) {
    const [x0, y0] = ring[i]
    const [x1, y1] = ring[(i + 1) % ring.length]
    const cross = x0 * y1 - x1 * y0
    area += cross
    cx += (x0 + x1) * cross
    cy += (y0 + y1) * cross
  }
  area /= 2
  if (Math.abs(area) < 1e-9) {
    return { area: 0, centroid: [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length] }
  }
  return { area, centroid: [cx / (6 * area), cy / (6 * area)] }
}

export function parseRegions(json: unknown): RegionData[] {
  if (!Array.isArray(json)) return []
  const result: RegionData[] = []
  for (const item of json) {
    if (typeof item !== 'object' || item === null) continue
    const { code, nameEn, nameFr, paths } = item as Record<string, unknown>
    if (typeof code !== 'string' || !Array.isArray(paths)) continue
    const rings = paths.filter(isRing)
    if (rings.length === 0) continue

    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    let best = { area: -1, centroid: [0, 0] as [number, number] }
    for (const ring of rings) {
      for (const [x, y] of ring) {
        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x)
        y1 = Math.max(y1, y)
      }
      const c = ringCentroid(ring)
      if (Math.abs(c.area) > best.area) best = { area: Math.abs(c.area), centroid: c.centroid }
    }

    result.push({
      code,
      countryCode: code.split('-')[0],
      nameEn: typeof nameEn === 'string' ? nameEn : code,
      nameFr: typeof nameFr === 'string' ? nameFr : typeof nameEn === 'string' ? nameEn : code,
      svg: rings.map((r) => `M${r.map(([x, y]) => `${x} ${y}`).join('L')}Z`).join(''),
      bounds: [
        [x0, y0],
        [x1, y1],
      ],
      labelPoint: best.centroid,
    })
  }
  return result
}
