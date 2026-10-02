/** Fichier de synchronisation, dans le dossier caché de l'application sur le Drive de l'utilisateur. */
export const SYNC_FILE_NAME = 'mytravels-sync.json'

const API = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'

export class DriveError extends Error {
  constructor(
    message: string,
    /** Code HTTP, ou 0 si le réseau est indisponible. */
    readonly status: number,
  ) {
    super(message)
  }
}

export interface DriveClient {
  /** Identifiant du fichier de synchronisation, ou null s'il n'existe pas encore. */
  find(): Promise<string | null>
  read(id: string): Promise<string>
  create(content: string): Promise<string>
  update(id: string, content: string): Promise<void>
  remove(id: string): Promise<void>
}

export function createDriveClient(getToken: () => string, fetchFn: typeof fetch = (...a) => fetch(...a)): DriveClient {
  async function call(url: string, init: RequestInit = {}): Promise<Response> {
    let res: Response
    try {
      res = await fetchFn(url, { ...init, headers: { Authorization: `Bearer ${getToken()}`, ...init.headers } })
    } catch (e) {
      throw new DriveError(e instanceof Error ? e.message : 'network', 0)
    }
    if (!res.ok) throw new DriveError(`Drive: HTTP ${res.status}`, res.status)
    return res
  }

  return {
    async find() {
      const q = encodeURIComponent(`name='${SYNC_FILE_NAME}'`)
      const res = await call(`${API}?spaces=appDataFolder&q=${q}&fields=files(id)`)
      const data = (await res.json()) as { files?: { id: string }[] }
      return data.files?.[0]?.id ?? null
    },

    async read(id) {
      return (await call(`${API}/${id}?alt=media`)).text()
    },

    async create(content) {
      const boundary = `mytravels${Math.random().toString(16).slice(2)}`
      const meta = JSON.stringify({ name: SYNC_FILE_NAME, parents: ['appDataFolder'], mimeType: 'application/json' })
      const body =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`
      const res = await call(`${UPLOAD}?uploadType=multipart&fields=id`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      })
      return ((await res.json()) as { id: string }).id
    },

    async update(id, content) {
      await call(`${UPLOAD}/${id}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: content,
      })
    },

    async remove(id) {
      await call(`${API}/${id}`, { method: 'DELETE' })
    },
  }
}
