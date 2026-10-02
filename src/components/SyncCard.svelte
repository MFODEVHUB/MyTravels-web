<script lang="ts">
  import { formatDateTime } from '../lib/format'
  import { store } from '../lib/store.svelte'
  import { sync } from '../lib/sync.svelte'

  const busy = $derived(sync.status === 'connecting' || sync.status === 'syncing')
  const connected = $derived(sync.status !== 'off')

  const lastSync = $derived(
    sync.lastSyncAt ? formatDateTime(sync.lastSyncAt, store.lang) : store.t('sync.never'),
  )

  const resultText = $derived.by(() => {
    const s = sync.summary
    if (!s) return ''
    const parts: string[] = []
    if (s.created) parts.push(store.t('sync.result.created'))
    if (s.pulled.countries || s.pulled.regions || s.pulled.cities) parts.push(store.t('sync.result.pulled', { ...s.pulled }))
    return parts.join(' ')
  })

  const errorText = $derived.by(() => {
    const e = sync.error
    // Fermer la fenêtre Google est un choix de l'utilisateur, pas une erreur à afficher.
    if (!e || e.detail === 'popup_closed') return ''
    return store.t(`sync.error.${e.kind}` as never, { detail: e.detail })
  })

  /** Conseil quand la connexion échoue ou que la fenêtre Google est refermée (une erreur affichée dans cette fenêtre n'est pas visible de la page). */
  const hintText = $derived(sync.error?.kind === 'auth' ? store.t('sync.authHint') : '')

  async function deleteCloud() {
    if (!confirm(store.t('sync.deleteCloudConfirm'))) return
    if (await sync.deleteCloud()) alert(store.t('sync.cloudDeleted'))
  }
</script>

<section class="card">
  <h2>{store.t('sync.title')}</h2>

  {#if !connected}
    <p class="hint">{store.t('sync.intro')}</p>
    <button class="btn primary" disabled={busy} onclick={() => sync.connect()}>
      {busy ? store.t('sync.connecting') : store.t('sync.connect')}
    </button>
  {:else}
    <p class="status" data-status={sync.status} role="status">
      <span class="dot"></span>
      {store.t(`sync.status.${sync.status}` as never)}
    </p>
    <p class="hint small">{store.t('sync.lastSync', { time: lastSync })}</p>

    {#if sync.status === 'needs-auth'}
      <p class="hint small">{store.t('sync.reconnectHint')}</p>
      <button class="btn primary" onclick={() => sync.connect()}>{store.t('sync.reconnect')}</button>
    {:else}
      <div class="actions">
        <button class="btn" disabled={busy} onclick={() => sync.syncNow()}>{store.t('sync.syncNow')}</button>
        <button class="btn" disabled={busy} onclick={() => sync.disconnect()}>{store.t('sync.disconnect')}</button>
      </div>
    {/if}

    {#if resultText}<p class="msg">{resultText}</p>{/if}
    <button class="link" disabled={busy} onclick={deleteCloud}>{store.t('sync.deleteCloud')}</button>
  {/if}

  {#if errorText}<p class="msg error" role="alert">{errorText}</p>{/if}
  {#if hintText}<p class="msg">{hintText}</p>{/if}
</section>

<style>
  .card {
    margin: 16px 0;
    padding: 16px;
    border-radius: 16px;
    border: 1.5px solid var(--border);
    background: var(--surface);
  }
  h2 {
    margin: 0 0 8px;
    color: var(--on-surface-var);
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .hint {
    margin: 0 0 12px;
    color: var(--on-surface-var);
    line-height: 1.45;
  }
  .hint.small {
    font-size: 0.85rem;
    margin: 4px 0 10px;
  }
  .status {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-weight: 700;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--on-surface-var);
  }
  [data-status='idle'] .dot {
    background: var(--map-visited);
  }
  [data-status='syncing'] .dot,
  [data-status='connecting'] .dot {
    background: var(--primary);
    animation: pulse 1s ease-in-out infinite;
  }
  [data-status='needs-auth'] .dot,
  [data-status='error'] .dot {
    background: var(--map-wishlist);
  }
  @keyframes pulse {
    50% {
      opacity: 0.3;
    }
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 8px;
  }
  .msg {
    margin: 10px 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: var(--surface-variant);
    color: var(--on-surface);
    font-weight: 600;
  }
  .msg.error {
    background: color-mix(in srgb, var(--map-wishlist) 18%, var(--surface));
    color: var(--map-wishlist);
  }
  .link {
    display: block;
    margin-top: 6px;
    padding: 0;
    border: none;
    background: none;
    color: var(--on-surface-var);
    font: inherit;
    font-size: 0.85rem;
    text-decoration: underline;
    cursor: pointer;
  }
  .btn:disabled {
    opacity: 0.5;
  }
</style>
