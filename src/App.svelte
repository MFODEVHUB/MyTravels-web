<script lang="ts">
  import { onMount } from 'svelte'
  import CountryList from './components/CountryList.svelte'
  import CountrySheet from './components/CountrySheet.svelte'
  import MapView from './components/MapView.svelte'
  import PromoPill from './components/PromoPill.svelte'
  import Settings from './components/Settings.svelte'
  import StatsPage from './components/StatsPage.svelte'
  import { store } from './lib/store.svelte'
  import { sync } from './lib/sync.svelte'
  import type { Selection } from './lib/types'

  type Tab = 'map' | 'countries' | 'stats' | 'settings'
  const TABS: { id: Tab; label: () => string; icon: string }[] = [
    {
      id: 'map',
      label: () => store.t('nav.map'),
      icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm-1 17.9A8 8 0 014.1 13H8v1a2 2 0 002 2v3.9zM17.9 17A2 2 0 0016 16h-1v-3a1 1 0 00-1-1H8v-2h2a1 1 0 001-1V7h2a2 2 0 002-2v-.4A8 8 0 0117.9 17z',
    },
    {
      id: 'countries',
      label: () => store.t('nav.countries'),
      icon: 'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z',
    },
    {
      id: 'stats',
      label: () => store.t('nav.stats'),
      icon: 'M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z',
    },
    {
      id: 'settings',
      label: () => store.t('nav.settings'),
      icon: 'M19.4 13a7.5 7.5 0 000-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 00-1.7-1L15 3.3h-4l-.4 2.6a7.6 7.6 0 00-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 000 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 001.7 1l.4 2.6h4l.4-2.6a7.6 7.6 0 001.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z',
    },
  ]

  let tab = $state<Tab>('map')
  let selection = $state<Selection | null>(null)

  onMount(() => void store.init().then(() => sync.init()))

  $effect(() => {
    document.documentElement.dataset.theme = store.dark ? 'dark' : 'light'
    document.documentElement.lang = store.lang
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', store.dark ? '#121212' : '#5c6bc0')
  })
</script>

<main>
  {#if !store.loaded}
    <div class="boot" role="status"></div>
  {:else if tab === 'map'}
    <MapView {selection} onselect={(s) => (selection = s)} onsettings={() => (tab = 'settings')} />
  {:else if tab === 'countries'}
    <div class="scroll"><CountryList onselect={(code) => (selection = { country: code })} /></div>
  {:else if tab === 'stats'}
    <div class="scroll"><StatsPage onselect={(code) => (selection = { country: code })} /></div>
  {:else}
    <div class="scroll"><Settings /></div>
  {/if}
  <!-- Toujours montée (son état vit le temps de la session), mais affichée seulement sur la carte. -->
  <PromoPill active={store.loaded && tab === 'map'} />
</main>

<nav>
  {#each TABS as t (t.id)}
    <button class:active={tab === t.id} aria-current={tab === t.id ? 'page' : undefined} onclick={() => (tab = t.id)}>
      <span class="icon">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d={t.icon} fill="currentColor" /></svg>
        {#if t.id === 'settings' && sync.dot}<span class="dot {sync.dot}" aria-hidden="true"></span>{/if}
      </span>
      <span>{t.label()}</span>
    </button>
  {/each}
</nav>

{#if selection}
  <CountrySheet {selection} onclose={() => (selection = null)} />
{/if}

<style>
  main {
    flex: 1;
    min-height: 0;
    position: relative;
  }
  .scroll {
    height: 100%;
    overflow-y: auto;
  }
  .boot {
    height: 100%;
  }
  nav {
    display: flex;
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding-bottom: env(safe-area-inset-bottom);
  }
  nav button {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 4px 10px;
    border: none;
    background: none;
    color: var(--on-surface-var);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }
  nav button.active {
    color: var(--primary);
  }
  .icon {
    position: relative;
    display: inline-flex;
  }
  /* Point d'état de la synchronisation : absent quand tout va bien. */
  .dot {
    position: absolute;
    top: -1px;
    right: -3px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--surface);
    box-sizing: content-box;
  }
  .dot.alert {
    background: var(--map-wishlist);
  }
  .dot.offline {
    background: var(--on-surface-var);
  }
  .dot.busy {
    background: var(--primary);
    animation: pulse 1s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.3;
    }
  }
</style>
