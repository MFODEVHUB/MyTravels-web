import { get, set } from 'idb-keyval'
import { sanitizeState } from './backup'
import { detectLang, translate, translateCount, type MessageKey } from './i18n'
import { emptyState, toVisitStatus, type AppState, type Lang, type ThemePref, type VisitStatus } from './types'

const STATE_KEY = 'mytravels-state'
const PREFS_KEY = 'mytravels-prefs'

interface Prefs {
  lang: Lang | 'auto'
  theme: ThemePref
}

function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>
    return {
      lang: raw.lang === 'fr' || raw.lang === 'en' ? raw.lang : 'auto',
      theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : 'auto',
    }
  } catch {
    return { lang: 'auto', theme: 'auto' }
  }
}

class Store {
  state = $state<AppState>(emptyState())
  loaded = $state(false)
  /** Incrémenté à chaque modification : sert de déclencheur de redessin pour la carte. */
  rev = $state(0)
  prefs = $state<Prefs>(loadPrefs())
  systemDark = $state(false)

  lang = $derived<Lang>(this.prefs.lang === 'auto' ? detectLang() : this.prefs.lang)
  dark = $derived(this.prefs.theme === 'auto' ? this.systemDark : this.prefs.theme === 'dark')

  private saveTimer: ReturnType<typeof setTimeout> | undefined
  /** Appelé après chaque modification faite par l'utilisateur (la synchronisation s'y branche). */
  onChange: (() => void) | null = null

  async init() {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    this.systemDark = media.matches
    media.addEventListener('change', (e) => (this.systemDark = e.matches))
    try {
      this.state = sanitizeState(await get(STATE_KEY))
    } catch {
      this.state = emptyState()
    }
    this.loaded = true
    this.rev++
  }

  t = (key: MessageKey, params?: Record<string, string | number>) => translate(this.lang, key, params)
  /** Texte accordé en nombre (voir `translateCount`). */
  tc = (base: string, n: number) => translateCount(this.lang, base, n)

  statusOf(code: string): VisitStatus {
    return this.state.countries[code]?.status ?? 'NONE'
  }

  /** Une remise à "Non visité" est conservée, datée : c'est ce qui permet de la propager aux autres appareils. */
  setStatus(code: string, status: VisitStatus) {
    const updatedAt = Date.now()
    if (status === 'NONE') this.state.countries[code] = { status, updatedAt }
    else this.state.countries[code] = { status, visitedAt: this.state.countries[code]?.visitedAt, updatedAt }
    this.changed()
  }

  regionStatus(code: string): VisitStatus {
    return toVisitStatus(this.state.regions.find((r) => r.code === code)?.status)
  }

  setRegionStatus(code: string, status: VisitStatus) {
    const i = this.state.regions.findIndex((r) => r.code === code)
    const entry = { code, status, updatedAt: Date.now() }
    if (i >= 0) this.state.regions[i] = entry
    else this.state.regions.push(entry)
    this.changed()
  }

  setVisitedAt(code: string, visitedAt: number | undefined) {
    const rec = this.state.countries[code]
    if (!rec) return
    this.state.countries[code] = { status: rec.status, visitedAt, updatedAt: Date.now() }
    this.changed()
  }

  replaceAll(next: AppState) {
    this.state = next
    this.changed()
  }

  /** Copie détachée de l'état courant, utilisable hors réactivité (fusion, envoi). */
  snapshot(): AppState {
    return $state.snapshot(this.state) as AppState
  }

  /** Applique le résultat d'une synchronisation : enregistré en local, sans relancer une synchronisation. */
  applySynced(next: AppState) {
    this.state = next
    this.rev++
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => void this.flush(), 200)
  }

  setLang(lang: Prefs['lang']) {
    this.prefs.lang = lang
    this.savePrefs()
  }

  setTheme(theme: ThemePref) {
    this.prefs.theme = theme
    this.savePrefs()
  }

  private changed() {
    this.onChange?.()
    this.rev++
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => void this.flush(), 200)
  }

  async flush() {
    try {
      await set(STATE_KEY, $state.snapshot(this.state))
    } catch (e) {
      console.error('Sauvegarde locale impossible', e)
    }
  }

  private savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify($state.snapshot(this.prefs)))
    } catch {
      /* stockage indisponible : les préférences ne survivent pas au rechargement */
    }
  }
}

export const store = new Store()
