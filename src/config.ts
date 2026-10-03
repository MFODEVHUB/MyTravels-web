/** Fiche Play Store de l'app Android (même URL que MapExporter.kt côté Android). */
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.mfodevhub.mytravels'

/**
 * Lien Play avec une provenance (`medium` : carte, pastille, QR…). Le paramètre `referrer` apparaît dans la Play
 * Console, ce qui permet de mesurer ce qui amène des installations sans aucun traceur sur le site.
 */
export const playUrl = (medium: string): string =>
  `${PLAY_STORE_URL}&referrer=${encodeURIComponent(`utm_source=web&utm_medium=${medium}`)}`

/**
 * À passer à `true` une fois la fiche publique (vérifier que l'URL ne renvoie pas 404) : l'encart
 * affiche alors le lien actif au lieu de « Bientôt sur Google Play ».
 */
export const PLAY_STORE_PUBLIC = false

/**
 * Carte « Synchronisation » proposée à tout le monde. L'application Google (écran de consentement) est en production.
 * Repasser à `false` pour la masquer : elle reste alors activable pour soi avec `?sync=1` dans l'adresse (mémorisé).
 */
export const SYNC_PUBLIC = true

/** Identifiant client OAuth (type Web) du projet Google Cloud ; public par nature, pas un secret. */
export const GOOGLE_CLIENT_ID = '69838858611-idlecvf1pe2tl8sbcmivtmpftom4m0q1.apps.googleusercontent.com'
