import { TERRITORIES, TERRITORY_BY_CODE } from './territories'
import { emptyState, toVisitStatus, type AppState, type CityEntry, type RegionEntry } from './types'

/** Même version et même structure que `BackupManager` côté Android. */
const BACKUP_VERSION = 3

export class BackupError extends Error {}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

export function exportBackup(state: AppState): string {
  const countries = TERRITORIES.map((t) => {
    const rec = state.countries[t.code]
    return {
      code: t.code,
      status: rec?.status ?? 'NONE',
      ...(rec?.visitedAt != null ? { visitedAt: rec.visitedAt } : {}),
    }
  })
  return JSON.stringify(
    { version: BACKUP_VERSION, countries, cities: state.cities, regions: state.regions },
    null,
    2,
  )
}

/** Lit un backup v1, v2 ou v3 (Android ou web). Lève `BackupError` si le fichier n'est pas exploitable. */
export function parseBackup(text: string): AppState {
  let root: unknown
  try {
    root = JSON.parse(text)
  } catch {
    throw new BackupError('invalid-json')
  }
  if (!isObject(root) || !Array.isArray(root.countries)) throw new BackupError('invalid-format')

  const version = typeof root.version === 'number' ? root.version : 1
  if (version < 1 || version > BACKUP_VERSION) throw new BackupError('unsupported-version')

  const state = emptyState()
  for (const item of root.countries) {
    if (!isObject(item) || typeof item.code !== 'string') continue
    if (!TERRITORY_BY_CODE.has(item.code)) continue
    const status = toVisitStatus(item.status)
    const visitedAt = typeof item.visitedAt === 'number' && item.visitedAt >= 0 ? item.visitedAt : undefined
    if (status === 'NONE' && visitedAt === undefined) continue
    state.countries[item.code] = visitedAt === undefined ? { status } : { status, visitedAt }
  }

  state.cities = asArray(root.cities).flatMap((c): CityEntry[] =>
    isObject(c) && typeof c.countryCode === 'string' && typeof c.name === 'string'
      ? [{ countryCode: c.countryCode, name: c.name, status: String(c.status ?? 'NONE') }]
      : [],
  )

  // Comme côté Android : les régions "NONE" sont ignorées à l'import (v2+ uniquement).
  if (version >= 2) {
    state.regions = asArray(root.regions).flatMap((r): RegionEntry[] =>
      isObject(r) && typeof r.code === 'string' && r.status !== 'NONE'
        ? [{ code: r.code, status: String(r.status) }]
        : [],
    )
  }
  return state
}

/** Valide un état relu depuis IndexedDB (donnée potentiellement ancienne ou corrompue). */
export function sanitizeState(value: unknown): AppState {
  if (!isObject(value)) return emptyState()
  const state = emptyState()
  if (isObject(value.countries)) {
    for (const [code, rec] of Object.entries(value.countries)) {
      if (!TERRITORY_BY_CODE.has(code) || !isObject(rec)) continue
      const status = toVisitStatus(rec.status)
      const visitedAt = typeof rec.visitedAt === 'number' ? rec.visitedAt : undefined
      state.countries[code] = visitedAt === undefined ? { status } : { status, visitedAt }
    }
  }
  state.cities = asArray(value.cities).filter(
    (c): c is CityEntry => isObject(c) && typeof c.countryCode === 'string' && typeof c.name === 'string',
  )
  state.regions = asArray(value.regions).filter(
    (r): r is RegionEntry => isObject(r) && typeof r.code === 'string',
  )
  return state
}
