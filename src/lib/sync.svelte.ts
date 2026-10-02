import { SYNC_PUBLIC } from '../config'
import { createDriveClient, DriveError, type DriveClient } from './drive'
import { AuthError, GoogleAuth, type AuthProvider } from './googleAuth'
import { diffStates, mergeStates, statesEqual, type Diff } from './merge'
import { store } from './store.svelte'
import { deleteRemote, RemoteCorruptError, runSync } from './syncCore'
import { MockAuth, MockDrive } from './syncMock'

export type SyncStatus = 'off' | 'connecting' | 'syncing' | 'idle' | 'needs-auth' | 'offline' | 'error'

const PREFS_KEY = 'mytravels-sync'
const PREVIEW_KEY = 'mytravels-sync-preview'
/** Regroupe les gestes rapprochés en un seul envoi. */
const DEBOUNCE_MS = 3000
/** À la remise au premier plan, on ne resynchronise pas si la dernière passe est récente. */
const FOCUS_MIN_INTERVAL_MS = 60_000

interface Prefs {
  enabled: boolean
  lastSyncAt?: number
}

function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>
    return { enabled: raw.enabled === true, lastSyncAt: typeof raw.lastSyncAt === 'number' ? raw.lastSyncAt : undefined }
  } catch {
    return { enabled: false }
  }
}

/** La fonction est-elle proposée à cet utilisateur ? (voir SYNC_PUBLIC dans config.ts) */
function isAvailable(): boolean {
  if (SYNC_PUBLIC) return true
  try {
    if (new URLSearchParams(location.search).has('sync')) localStorage.setItem(PREVIEW_KEY, '1')
    return localStorage.getItem(PREVIEW_KEY) === '1' || new URLSearchParams(location.search).has('mocksync')
  } catch {
    return false
  }
}

export class SyncEngine {
  /** Proposée à l'utilisateur : sinon ni carte, ni pastille, ni synchronisation. */
  readonly available = isAvailable()
  status = $state<SyncStatus>('off')
  lastSyncAt = $state<number | null>(null)
  /** Dernier résultat notable (première sauvegarde, données récupérées), pour l'afficher à l'utilisateur. */
  summary = $state<{ created: boolean; pulled: Diff } | null>(null)
  /** Type d'erreur ("corrupt", "auth", "generic") et détail. */
  error = $state<{ kind: 'corrupt' | 'auth' | 'generic'; detail: string } | null>(null)

  /**
   * Point d'état de l'onglet Réglages : rien quand tout va bien, sinon ce qui mérite l'attention.
   * `busy` = en cours, `alert` = une action de l'utilisateur est nécessaire, `offline` = hors ligne.
   */
  dot = $derived<'busy' | 'alert' | 'offline' | null>(
    this.status === 'syncing' || this.status === 'connecting'
      ? 'busy'
      : this.status === 'needs-auth' || this.status === 'error'
        ? 'alert'
        : this.status === 'offline'
          ? 'offline'
          : null,
  )

  private running = false
  private rerun = false
  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(
    private auth: AuthProvider,
    private drive: DriveClient,
  ) {}

  /** À appeler une fois les données locales chargées. */
  async init() {
    if (!this.available) return
    store.onChange = () => this.notifyChange()
    window.addEventListener('online', () => {
      if (this.status === 'offline') void this.syncNow()
    })
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || this.status === 'off') return
      this.checkToken()
      const recent = this.lastSyncAt !== null && Date.now() - this.lastSyncAt < FOCUS_MIN_INTERVAL_MS
      if (this.status === 'idle' && !recent) void this.syncNow()
    })
    setInterval(() => this.checkToken(), 30_000)

    const prefs = loadPrefs()
    if (!prefs.enabled) return
    this.lastSyncAt = prefs.lastSyncAt ?? null
    this.status = 'needs-auth'
    if (this.auth.hasToken()) return void this.syncNow()
    // Tentative sans geste : réussit parfois, sinon l'utilisateur voit "Reconnecter".
    try {
      await this.auth.signIn(false)
      await this.syncNow()
    } catch {
      this.status = 'needs-auth'
    }
  }

  /** Connexion demandée par l'utilisateur (geste), puis première synchronisation. */
  async connect() {
    const previous = this.status
    this.status = 'connecting'
    this.error = null
    try {
      await this.auth.signIn(true)
    } catch (e) {
      this.fail(e)
      // Un échec à la toute première connexion ne doit pas laisser la synchronisation à moitié activée.
      this.status = previous === 'off' ? 'off' : 'needs-auth'
      return
    }
    this.savePrefs(true)
    await this.syncNow()
  }

  async disconnect() {
    clearTimeout(this.timer)
    this.auth.forget()
    this.savePrefs(false)
    this.status = 'off'
    this.summary = null
    this.error = null
    this.lastSyncAt = null
  }

  /** Efface le fichier du Drive et coupe la synchronisation ; les données locales restent. */
  async deleteCloud(): Promise<boolean> {
    try {
      if (!this.auth.hasToken()) await this.auth.signIn(true)
      const deleted = await deleteRemote(this.drive)
      await this.disconnect()
      return deleted
    } catch (e) {
      this.fail(e)
      return false
    }
  }

  notifyChange() {
    if (this.status === 'off') return
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.syncNow(), DEBOUNCE_MS)
  }

  async syncNow() {
    if (this.status === 'off') return
    if (this.running) {
      this.rerun = true
      return
    }
    if (!this.auth.hasToken()) {
      this.status = 'needs-auth'
      return
    }
    this.running = true
    this.status = 'syncing'
    this.error = null
    const revAtStart = store.rev
    try {
      const local = store.snapshot()
      const result = await runSync(local, this.drive)
      // Une modification faite pendant l'envoi gagne (elle est plus récente) et déclenche une nouvelle passe.
      const touched = store.rev !== revAtStart
      const current = touched ? store.snapshot() : local
      const merged = touched ? mergeStates(current, result.merged) : result.merged
      if (!statesEqual(current, merged)) store.applySynced(merged)
      if (touched) this.rerun = true
      this.lastSyncAt = Date.now()
      this.savePrefs(true)
      if (result.created || result.pulled.countries || result.pulled.regions || result.pulled.cities) {
        this.summary = { created: result.created, pulled: diffStates(current, merged) }
      }
      this.status = 'idle'
    } catch (e) {
      this.fail(e)
    } finally {
      this.running = false
      const again = this.rerun && this.status === 'idle'
      this.rerun = false
      if (again) void this.syncNow()
    }
  }

  private checkToken() {
    if (this.status === 'idle' && !this.auth.hasToken()) this.status = 'needs-auth'
  }

  private fail(e: unknown) {
    if (e instanceof DriveError && e.status === 401) {
      this.auth.forget()
      this.status = 'needs-auth'
    } else if (e instanceof DriveError && e.status === 0) {
      this.status = 'offline'
    } else if (e instanceof RemoteCorruptError) {
      this.status = 'error'
      this.error = { kind: 'corrupt', detail: e.message }
    } else if (e instanceof AuthError) {
      this.status = 'needs-auth'
      this.error = { kind: 'auth', detail: e.type }
    } else {
      this.status = 'error'
      this.error = { kind: 'generic', detail: e instanceof Error ? e.message : String(e) }
    }
  }

  private savePrefs(enabled: boolean) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ enabled, lastSyncAt: this.lastSyncAt ?? undefined } satisfies Prefs))
    } catch {
      /* la synchronisation reste active pour cette session */
    }
  }
}

const useMock = import.meta.env.DEV && new URLSearchParams(location.search).has('mocksync')
const auth: AuthProvider = useMock ? new MockAuth() : new GoogleAuth()
export const sync = new SyncEngine(
  auth,
  useMock ? new MockDrive() : createDriveClient(() => auth.token()),
)
// Outil de développement : permet de forcer un état pour vérifier l'interface (retiré du build de production).
if (useMock) (window as unknown as { __sync: SyncEngine }).__sync = sync
