import raw from '../data/territories.json'
import type { Lang, Territory } from './types'

export const TERRITORIES: Territory[] = raw as Territory[]
export const TERRITORY_BY_CODE: ReadonlyMap<string, Territory> = new Map(TERRITORIES.map((t) => [t.code, t]))
export const CONTINENTS = ['EU', 'AS', 'AF', 'NA', 'SA', 'OC', 'AN'] as const

export function territoryName(t: Territory, lang: Lang): string {
  const name = lang === 'fr' ? t.nameFr || t.nameEn : t.nameEn || t.nameFr
  return name || t.code
}

/** Minuscules sans accents, pour la recherche. */
export const normalize = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
