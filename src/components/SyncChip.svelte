<script lang="ts">
  import { formatDateTime } from '../lib/format'
  import { store } from '../lib/store.svelte'
  import { sync } from '../lib/sync.svelte'

  let { onsettings }: { onsettings?: () => void } = $props()

  let open = $state(false)

  const needsAction = $derived(sync.status === 'needs-auth' || sync.status === 'error')
  const statusLabel = $derived(store.t(`sync.status.${sync.status}` as never))
  const lastSync = $derived(sync.lastSyncAt ? formatDateTime(sync.lastSyncAt, store.lang) : store.t('sync.never'))

  function primary() {
    open = false
    if (sync.status === 'needs-auth') void sync.connect()
    else void sync.syncNow()
  }

  function settings() {
    open = false
    onsettings?.()
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (open = false)} />

{#if sync.status !== 'off'}
  <div class="wrap">
    <button
      class="chip"
      class:expanded={sync.status === 'needs-auth'}
      data-status={sync.status}
      aria-label="{store.t('sync.chip.label')} : {statusLabel}"
      aria-expanded={open}
      onclick={() => (open = !open)}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        {#if sync.status === 'syncing' || sync.status === 'connecting'}
          <path
            class="spin"
            fill="currentColor"
            d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
          />
        {:else if sync.status === 'offline'}
          <path
            fill="currentColor"
            d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 6.23 11.08 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 18.16 24 16.68 24 15c0-2.64-2.05-4.78-4.65-4.96zM3 5.27l2.75 2.74C2.56 8.15 0 10.77 0 14c0 3.31 2.69 6 6 6h11.73l2 2L21 20.73 4.27 4 3 5.27zM7.73 10l8 8H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h1.73z"
          />
        {:else if needsAction}
          <path
            fill="currentColor"
            d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
          />
          <rect x="11" y="9" width="2" height="5.5" rx="1" fill="#fff" />
          <circle cx="12" cy="17" r="1.2" fill="#fff" />
        {:else}
          <path
            fill="currentColor"
            d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM10 17l-3.5-3.5 1.41-1.41L10 14.17 15.59 8.58 17 10l-7 7z"
          />
        {/if}
      </svg>
      {#if sync.status === 'needs-auth'}<span>{store.t('sync.reconnect')}</span>{/if}
    </button>

    {#if open}
      <button class="backdrop" aria-label={store.t('sheet.close')} onclick={() => (open = false)}></button>
      <div class="popover" role="dialog" aria-label={store.t('sync.title')}>
        <p class="state" data-status={sync.status}><span class="dot"></span>{statusLabel}</p>
        <p class="meta">{store.t('sync.lastSync', { time: lastSync })}</p>
        {#if sync.status === 'needs-auth'}
          <p class="meta">{store.t('sync.reconnectHint')}</p>
        {/if}
        <button class="btn primary" disabled={sync.status === 'syncing' || sync.status === 'connecting'} onclick={primary}>
          {sync.status === 'needs-auth' ? store.t('sync.reconnect') : store.t('sync.syncNow')}
        </button>
        {#if onsettings}
          <button class="link" onclick={settings}>{store.t('sync.openSettings')}</button>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .wrap {
    position: relative;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 40px;
    height: 40px;
    padding: 0 9px;
    border: none;
    border-radius: 999px;
    background: var(--surface);
    color: var(--on-surface-var);
    font: inherit;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.3);
  }
  .chip.expanded {
    padding: 0 14px 0 10px;
  }
  .chip[data-status='idle'] {
    color: var(--map-visited);
  }
  .chip[data-status='syncing'],
  .chip[data-status='connecting'] {
    color: var(--primary);
  }
  .chip[data-status='needs-auth'],
  .chip[data-status='error'] {
    color: var(--map-wishlist);
  }
  .spin {
    transform-origin: 12px 12px;
    animation: spin 1.1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 5;
    border: none;
    background: transparent;
    cursor: default;
  }
  .popover {
    position: absolute;
    z-index: 6;
    top: 48px;
    left: 0;
    width: 240px;
    padding: 14px;
    border-radius: 14px;
    background: var(--surface);
    color: var(--on-surface);
    box-shadow: 0 4px 20px rgb(0 0 0 / 0.35);
  }
  .state {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 4px;
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
  }
  [data-status='needs-auth'] .dot,
  [data-status='error'] .dot {
    background: var(--map-wishlist);
  }
  .meta {
    margin: 0 0 10px;
    color: var(--on-surface-var);
    font-size: 0.82rem;
    line-height: 1.35;
  }
  .btn {
    width: 100%;
    padding: 9px 12px;
    font-size: 0.9rem;
  }
  .btn:disabled {
    opacity: 0.5;
  }
  .link {
    display: block;
    margin: 10px auto 0;
    padding: 0;
    border: none;
    background: none;
    color: var(--primary);
    font: inherit;
    font-size: 0.85rem;
    text-decoration: underline;
    cursor: pointer;
  }
</style>
