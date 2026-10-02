<script lang="ts">
  import { store } from '../lib/store.svelte'
  import { sync } from '../lib/sync.svelte'

  const label = $derived(
    sync.status === 'needs-auth' ? store.t('sync.reconnect') : store.t(`sync.status.${sync.status}` as never),
  )

  function onclick() {
    if (sync.status === 'needs-auth') void sync.connect()
    else if (sync.status !== 'syncing' && sync.status !== 'connecting') void sync.syncNow()
  }
</script>

{#if sync.status !== 'off'}
  <button class="chip" data-status={sync.status} aria-label="{store.t('sync.chip.label')} : {label}" {onclick}>
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
      />
    </svg>
    <span>{label}</span>
  </button>
{/if}

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: none;
    border-radius: 999px;
    background: var(--surface);
    color: var(--on-surface);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.25);
  }
  .chip[data-status='idle'] svg {
    color: var(--map-visited);
  }
  .chip[data-status='syncing'] svg,
  .chip[data-status='connecting'] svg {
    color: var(--primary);
    animation: pulse 1s ease-in-out infinite;
  }
  .chip[data-status='needs-auth'],
  .chip[data-status='error'] {
    color: var(--map-wishlist);
  }
  @keyframes pulse {
    50% {
      opacity: 0.3;
    }
  }
</style>
