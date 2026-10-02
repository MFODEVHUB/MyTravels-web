export type VisitStatus = 'NONE' | 'VISITED' | 'WISHLIST'
export type TerritoryType = 'COUNTRY' | 'ISLAND' | 'TERRITORY'
export type Lang = 'fr' | 'en'
export type ThemePref = 'auto' | 'light' | 'dark'

export interface Territory {
  code: string
  nameEn: string
  nameFr: string
  /** AF, AN, AS, EU, NA, OC, SA */
  continent: string
  flag: string
  type: TerritoryType
}

export interface CountryRecord {
  status: VisitStatus
  /** epoch ms */
  visitedAt?: number
  /** Dernière modification (epoch ms), pour fusionner les appareils. Un statut NONE daté vaut suppression. */
  updatedAt?: number
}

/** Villes et régions : conservées telles quelles pour que l'export reste fidèle au backup Android (lots suivants). */
export interface CityEntry {
  countryCode: string
  name: string
  status: string
}
export interface RegionEntry {
  code: string
  status: string
  /** Dernière modification (epoch ms) ; un statut NONE daté vaut suppression. */
  updatedAt?: number
}

export interface AppState {
  countries: Record<string, CountryRecord>
  cities: CityEntry[]
  regions: RegionEntry[]
}

export const emptyState = (): AppState => ({ countries: {}, cities: [], regions: [] })

/** Parsing défensif, comme `toVisitStatus` côté Android : toute valeur inconnue devient NONE. */
export function toVisitStatus(value: unknown): VisitStatus {
  return value === 'VISITED' || value === 'WISHLIST' ? value : 'NONE'
}

/** Élément sélectionné sur la carte : un pays, ou une région de ce pays (vue Régions). */
export interface Selection {
  country: string
  region?: { code: string; nameEn: string; nameFr: string }
}
