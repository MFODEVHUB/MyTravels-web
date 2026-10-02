<script lang="ts">
  import { PLAY_STORE_PUBLIC, playUrl } from '../config'
  import { store } from '../lib/store.svelte'

  const DISMISS_KEY = 'mytravels-promo-dismissed'

  let { dismissible = false }: { dismissible?: boolean } = $props()

  const wasDismissed = () => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  }
  let dismissed = $state(wasDismissed())
  const hidden = $derived(dismissible && dismissed)

  function dismiss() {
    dismissed = true
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* stockage indisponible : l'encart reviendra au prochain chargement */
    }
  }
</script>

{#if !hidden}
  <aside class="promo">
    <img src="{import.meta.env.BASE_URL}icons/icon-192.png" alt="" width="52" height="52" />
    <div class="body">
      <h2>{store.t('promo.title')}</h2>
      <p>{store.t('promo.text')}</p>
      {#if PLAY_STORE_PUBLIC}
        <a class="cta" href={playUrl('card')} target="_blank" rel="noopener">▶ {store.t('promo.cta')}</a>
      {:else}
        <span class="cta soon">▶ {store.t('promo.soon')}</span>
      {/if}
    </div>
    {#if dismissible}
      <button class="close" aria-label={store.t('promo.dismiss')} onclick={dismiss}>×</button>
    {/if}
  </aside>
{/if}

<style>
  .promo {
    position: relative;
    display: flex;
    gap: 14px;
    align-items: flex-start;
    margin: 16px 0;
    padding: 16px;
    border-radius: 16px;
    border: 1.5px solid var(--border);
    background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 14%, var(--surface)), var(--surface));
    color: var(--on-surface);
  }
  img {
    border-radius: 12px;
    flex-shrink: 0;
  }
  .body {
    flex: 1;
    min-width: 0;
  }
  h2 {
    margin: 0 0 4px;
    padding: 0;
    position: static;
    background: none;
    color: var(--on-surface);
    font-size: 1.05rem;
    letter-spacing: 0;
    text-transform: none;
  }
  p {
    margin: 0 0 12px;
    color: var(--on-surface-var);
    font-size: 0.9rem;
    line-height: 1.4;
  }
  .cta {
    display: inline-block;
    padding: 9px 16px;
    border-radius: 12px;
    background: var(--primary);
    color: var(--on-primary);
    font-weight: 700;
    font-size: 0.9rem;
    text-decoration: none;
  }
  .cta.soon {
    background: var(--surface-variant);
    color: var(--on-surface-var);
    border: 1.5px dashed var(--border);
  }
  .close {
    position: absolute;
    top: 6px;
    right: 8px;
    border: none;
    background: none;
    color: var(--on-surface-var);
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    padding: 2px 6px;
  }
</style>
