import { describe, expect, it } from 'vitest'
import { createDriveClient, DriveError, SYNC_FILE_NAME, type DriveClient } from './drive'
import { exportBackup } from './backup'
import { deleteRemote, RemoteCorruptError, runSync } from './syncCore'
import { emptyState, type AppState } from './types'

/** Faux Drive en mémoire. */
function fakeDrive(initial?: string): DriveClient & { content: string | null; writes: number } {
  const d = {
    content: initial ?? null,
    writes: 0,
    async find() {
      return d.content === null ? null : 'file-1'
    },
    async read() {
      return d.content as string
    },
    async create(c: string) {
      d.content = c
      d.writes++
      return 'file-1'
    },
    async update(_id: string, c: string) {
      d.content = c
      d.writes++
    },
    async remove() {
      d.content = null
    },
  }
  return d
}

const withFr = (status: 'VISITED' | 'WISHLIST', updatedAt: number): AppState => ({
  ...emptyState(),
  countries: { FR: { status, updatedAt } },
})

describe('runSync', () => {
  it('première synchronisation : crée le fichier avec les données locales', async () => {
    const drive = fakeDrive()
    const res = await runSync(withFr('VISITED', 10), drive)
    expect(res).toMatchObject({ created: true, pushed: true })
    expect(drive.content).toContain('"FR"')
  })

  it('nouvel appareil : récupère la sauvegarde existante sans rien envoyer', async () => {
    const drive = fakeDrive(exportBackup(withFr('VISITED', 10)))
    const res = await runSync(emptyState(), drive)
    expect(res.merged.countries.FR.status).toBe('VISITED')
    expect(res.pulled.countries).toEqual({ visited: 1, wishlist: 0, removed: 0 })
    expect(res.pushed).toBe(false)
    expect(drive.writes).toBe(0)
  })

  it('fusionne deux appareils et renvoie le résultat', async () => {
    const drive = fakeDrive(exportBackup({ ...emptyState(), countries: { DE: { status: 'VISITED', updatedAt: 5 } } }))
    const res = await runSync(withFr('VISITED', 10), drive)
    expect(Object.keys(res.merged.countries).sort()).toEqual(['DE', 'FR'])
    expect(res.pushed).toBe(true)
    expect(drive.content).toContain('"DE"')
  })

  it('est stable : une seconde passe immédiate n’écrit plus rien', async () => {
    const drive = fakeDrive()
    const first = await runSync(withFr('VISITED', 10), drive)
    const writes = drive.writes
    const second = await runSync(first.merged, drive)
    expect(second).toMatchObject({ pushed: false, created: false })
    expect(drive.writes).toBe(writes)
  })

  it('propage une suppression faite sur un autre appareil', async () => {
    const drive = fakeDrive(exportBackup({ ...emptyState(), countries: { FR: { status: 'NONE', updatedAt: 99 } } }))
    const res = await runSync(withFr('VISITED', 10), drive)
    expect(res.merged.countries.FR.status).toBe('NONE')
    expect(res.pulled.countries).toEqual({ visited: 0, wishlist: 0, removed: 1 })
  })

  it('refuse d’écraser un fichier illisible', async () => {
    const drive = fakeDrive('pas du json')
    await expect(runSync(withFr('VISITED', 10), drive)).rejects.toBeInstanceOf(RemoteCorruptError)
    expect(drive.content).toBe('pas du json')
  })
})

describe('deleteRemote', () => {
  it('supprime le fichier s’il existe', async () => {
    const drive = fakeDrive('{}')
    expect(await deleteRemote(drive)).toBe(true)
    expect(await deleteRemote(drive)).toBe(false)
  })
})

describe('createDriveClient', () => {
  const calls: { url: string; init?: RequestInit }[] = []
  const respond = (body: unknown, status = 200): typeof fetch =>
    (async (url: string, init?: RequestInit) => {
      calls.push({ url, init })
      return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
    }) as unknown as typeof fetch

  it('cherche dans le dossier privé de l’application, avec le jeton', async () => {
    calls.length = 0
    const client = createDriveClient(() => 'tok', respond({ files: [{ id: 'abc' }] }))
    expect(await client.find()).toBe('abc')
    expect(calls[0].url).toContain('spaces=appDataFolder')
    expect(decodeURIComponent(calls[0].url)).toContain(SYNC_FILE_NAME)
    expect((calls[0].init?.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('renvoie null quand le fichier n’existe pas', async () => {
    expect(await createDriveClient(() => 't', respond({ files: [] })).find()).toBeNull()
  })

  it('crée le fichier dans appDataFolder (multipart)', async () => {
    calls.length = 0
    const id = await createDriveClient(() => 't', respond({ id: 'new' })).create('{"a":1}')
    expect(id).toBe('new')
    expect(calls[0].init?.method).toBe('POST')
    expect(String(calls[0].init?.body)).toContain('"parents":["appDataFolder"]')
  })

  it('traduit les échecs en DriveError avec le code HTTP', async () => {
    await expect(createDriveClient(() => 't', respond('no', 401)).find()).rejects.toMatchObject({ status: 401 })
    const offline = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    await expect(createDriveClient(() => 't', offline).find()).rejects.toBeInstanceOf(DriveError)
    await expect(createDriveClient(() => 't', offline).find()).rejects.toMatchObject({ status: 0 })
  })
})
