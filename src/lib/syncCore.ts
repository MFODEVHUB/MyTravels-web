import { BackupError, exportBackup, parseBackup } from './backup'
import type { DriveClient } from './drive'
import { diffStates, mergeStates, statesEqual, type Diff } from './merge'
import type { AppState } from './types'

export interface SyncResult {
  /** État fusionné, à appliquer en local. */
  merged: AppState
  /** Ce que la synchronisation a apporté en local. */
  pulled: Diff
  /** Un envoi vers le Drive a eu lieu. */
  pushed: boolean
  /** Première synchronisation : le fichier n'existait pas. */
  created: boolean
}

/** Le fichier du Drive n'est pas une sauvegarde MyTravels lisible : on ne l'écrase surtout pas. */
export class RemoteCorruptError extends Error {}

/**
 * Une passe de synchronisation : lire le Drive, fusionner, puis écrire seulement s'il y a du nouveau. Sans état :
 * deux appareils qui passent en même temps convergent à la passe suivante, la fusion étant idempotente.
 */
export async function runSync(local: AppState, drive: DriveClient): Promise<SyncResult> {
  const fileId = await drive.find()
  let remote: AppState | null = null
  if (fileId) {
    try {
      remote = parseBackup(await drive.read(fileId))
    } catch (e) {
      if (e instanceof BackupError) throw new RemoteCorruptError(e.message)
      throw e
    }
  }

  const merged = remote ? mergeStates(local, remote) : local
  const needsPush = !remote || !statesEqual(remote, merged)
  if (needsPush) {
    const content = exportBackup(merged)
    if (fileId) await drive.update(fileId, content)
    else await drive.create(content)
  }

  return { merged, pulled: diffStates(local, merged), pushed: needsPush, created: !fileId }
}

/** Supprime le fichier de synchronisation du Drive (les données locales ne sont pas touchées). */
export async function deleteRemote(drive: DriveClient): Promise<boolean> {
  const fileId = await drive.find()
  if (!fileId) return false
  await drive.remove(fileId)
  return true
}
