<script lang="ts">
  import ArcProgress from './ArcProgress.svelte'
  import AndroidPromo from './AndroidPromo.svelte'
  import { computeDetailedStats, percentOf } from '../lib/stats'
  import { store } from '../lib/store.svelte'
  import { TERRITORY_BY_CODE, territoryName } from '../lib/territories'

  let { onselect }: { onselect: (code: string) => void } = $props()

  const stats = $derived((store.rev, computeDetailedStats(store.state)))
  const us = $derived(stats.regions.find((r) => r.code === 'US'))
  const usTotal = $derived(us?.total ?? 0)

  // ── Héros : trois pages qui défilent (pays, continents, États US) ──
  let pager: HTMLDivElement
  let page = $state(0)
  let infoOpen = $state(false)

  function onScroll() {
    if (pager) page = Math.round(pager.scrollLeft / pager.clientWidth)
  }
  function goTo(i: number) {
    pager.scrollTo({ left: i * pager.clientWidth, behavior: 'smooth' })
  }

  const empty = $derived(stats.visited === 0 && stats.wishlist === 0)
  const continentName = (code: string) => store.t(`continent.${code}` as never)

  // ── Cartes par continent ──
  let open = $state<Record<string, boolean>>({})
  const collator = $derived(new Intl.Collator(store.lang, { sensitivity: 'base' }))
  const sortedNames = (codes: string[]) =>
    codes
      .map((code) => ({ code, t: TERRITORY_BY_CODE.get(code)! }))
      .filter((x) => x.t)
      .sort((a, b) => collator.compare(territoryName(a.t, store.lang), territoryName(b.t, store.lang)))

  // Même garde que les autres dialogues : un clic fantôme tactile ne doit pas fermer ce qui vient d'apparaître.
  let infoOpenedAt = 0
  function openInfo() {
    infoOpenedAt = performance.now()
    infoOpen = true
  }
  const onInfoScrim = () => {
    if (performance.now() - infoOpenedAt > 450) infoOpen = false
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (infoOpen = false)} />

{#snippet emptyState()}
  <div class="empty">
    <strong>{store.t('stats.empty.title')}</strong>
    <span>{store.t('stats.empty.subtitle')}</span>
  </div>
{/snippet}

{#snippet ring(value: number, caption: string, progress: number, color: string)}
  <div class="ring">
    <ArcProgress {progress} {color} />
    <div class="ring-text">
      <span class="big" style:color>{value}</span>
      <span class="cap">{caption}</span>
      <span class="pct">{Math.round(progress * 100)}%</span>
    </div>
  </div>
{/snippet}

<div class="page">
  <h1>{store.t('stats.title')}</h1>

  <section class="hero">
    <div class="pager" bind:this={pager} onscroll={onScroll}>
      <!-- Pays -->
      <div class="slide">
        {#if stats.visited === 0 && stats.wishlist === 0}
          {@render emptyState()}
        {:else}
          {@render ring(stats.visited, store.t('stats.countriesOf', { n: stats.total }), stats.total ? stats.visited / stats.total : 0, 'var(--map-visited)')}
          {#if stats.wishlist > 0}
            <span class="chip wish">{store.tc('stats.wishlist.countries', stats.wishlist)}</span>
          {/if}
        {/if}
        <button class="info" aria-label={store.t('stats.info')} onclick={openInfo}>ⓘ</button>
      </div>
      <!-- Continents -->
      <div class="slide">
        {#if stats.continentsVisited === 0}
          {@render emptyState()}
        {:else}
          {@render ring(stats.continentsVisited, store.t('stats.continentsOf', { n: stats.continentsTotal }), stats.continentsVisited / stats.continentsTotal, 'var(--map-visited)')}
          {#if stats.topContinent}
            <span class="chip vis">{store.t('stats.mostVisited', { name: continentName(stats.topContinent) })}</span>
          {/if}
        {/if}
      </div>
      <!-- États US -->
      <div class="slide">
        {#if !us || (us.visited === 0 && us.wishlist === 0)}
          {@render emptyState()}
        {:else}
          {@render ring(us.visited, store.t('stats.statesOf', { n: usTotal }), usTotal ? us.visited / usTotal : 0, 'var(--map-visited)')}
          {#if us.wishlist > 0}
            <span class="chip wish">{store.tc('stats.wishlist.states', us.wishlist)}</span>
          {/if}
        {/if}
      </div>
    </div>
    <div class="dots" role="tablist">
      {#each [0, 1, 2] as i (i)}
        <button class="dot" class:on={page === i} role="tab" aria-selected={page === i} aria-label={store.t('stats.page', { n: i + 1 })} onclick={() => goTo(i)}></button>
      {/each}
    </div>
  </section>

  <h2>{store.t('stats.byContinent')}</h2>
  {#each stats.continents as c (c.code)}
    {@const expanded = open[c.code] ?? false}
    <section class="card">
      <button class="head" aria-expanded={expanded} aria-label="{continentName(c.code)} — {store.t('stats.expand')}" onclick={() => (open[c.code] = !expanded)}>
        <span class="name">{continentName(c.code)}</span>
        {#if c.visited > 0}<span class="count vis">{c.visited}</span>{/if}
        {#if c.wishlist > 0}<span class="count wish">{c.wishlist}</span>{/if}
        <span class="of">/ {c.total}</span>
        <span class="pctv">{percentOf(c.visited, c.total)}%</span>
        <span class="chev" class:up={expanded} aria-hidden="true">⌄</span>
      </button>
      <div class="bar">
        {#if c.wishlist > 0}<div class="fill wishfill" style:width="{((c.visited + c.wishlist) / c.total) * 100}%"></div>{/if}
        {#if c.visited > 0}<div class="fill visfill" style:width="{(c.visited / c.total) * 100}%"></div>{/if}
      </div>
      {#if expanded}
        <div class="list">
          {#if c.visitedCodes.length === 0 && c.wishlistCodes.length === 0}
            <p class="none">{store.t('stats.continentEmpty')}</p>
          {/if}
          {#if c.visitedCodes.length}
            <h3 class="vis">{store.t('status.VISITED')}</h3>
            {#each sortedNames(c.visitedCodes) as x (x.code)}
              <button class="row" onclick={() => onselect(x.code)}><span class="flag">{x.t.flag}</span>{territoryName(x.t, store.lang)}</button>
            {/each}
          {/if}
          {#if c.wishlistCodes.length}
            <h3 class="wish">{store.t('status.WISHLIST')}</h3>
            {#each sortedNames(c.wishlistCodes) as x (x.code)}
              <button class="row" onclick={() => onselect(x.code)}><span class="flag">{x.t.flag}</span>{territoryName(x.t, store.lang)}</button>
            {/each}
          {/if}
        </div>
      {/if}
    </section>
  {/each}

  <h2>{store.t('stats.regions')}</h2>
  <section class="card">
    {#each stats.regions as r (r.code)}
      {@const t = TERRITORY_BY_CODE.get(r.code)}
      <div class="region">
        <div class="head static">
          <span class="name">{#if t}<span class="rflag">{t.flag}</span>{territoryName(t, store.lang)}{:else}{r.code}{/if}</span>
          {#if r.visited > 0}<span class="count vis">{r.visited}</span>{/if}
          {#if r.wishlist > 0}<span class="count wish">{r.wishlist}</span>{/if}
          <span class="of">/ {r.total}</span>
          <span class="pctv">{percentOf(r.visited, r.total)}%</span>
        </div>
        <div class="bar">
          {#if r.wishlist > 0}<div class="fill wishfill" style:width="{((r.visited + r.wishlist) / r.total) * 100}%"></div>{/if}
          {#if r.visited > 0}<div class="fill visfill" style:width="{(r.visited / r.total) * 100}%"></div>{/if}
        </div>
      </div>
    {/each}
  </section>

  {#if stats.cities.visited > 0 || stats.cities.wishlist > 0}
    <h2>{store.t('stats.cities')}</h2>
    <section class="card cities">
      {#if stats.cities.visited > 0}<span class="chip vis">{store.tc('sync.item.cities.visited', stats.cities.visited)}</span>{/if}
      {#if stats.cities.wishlist > 0}<span class="chip wish">{store.tc('sync.item.cities.wishlist', stats.cities.wishlist)}</span>{/if}
      <p class="hint">{store.t('stats.citiesHint')}</p>
    </section>
  {/if}

  <AndroidPromo />
</div>

{#if infoOpen}
  <div class="scrim" onclick={onInfoScrim} role="presentation"></div>
  <div class="dialog" role="dialog" aria-modal="true" aria-label={store.t('stats.info.title', { n: stats.total })}>
    <h3>{store.t('stats.info.title', { n: stats.total })}</h3>
    <p>{store.t('stats.info.body')}</p>
    <button class="btn" onclick={() => (infoOpen = false)}>{store.t('sheet.close')}</button>
  </div>
{/if}

<style>
  .page {
    max-width: 720px;
    margin: 0 auto;
    padding: calc(16px + env(safe-area-inset-top)) 16px 24px;
  }
  h1 {
    margin: 0 0 12px;
    font-size: 1.5rem;
  }
  h2 {
    margin: 22px 0 8px;
    color: var(--primary);
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .hero {
    border-radius: 16px;
    background: var(--surface-variant);
    overflow: hidden;
  }
  .pager {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }
  .pager::-webkit-scrollbar {
    display: none;
  }
  .slide {
    position: relative;
    flex: 0 0 100%;
    min-height: 240px;
    scroll-snap-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 18px 24px;
  }
  .ring {
    position: relative;
    width: 148px;
    height: 148px;
  }
  .ring-text {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .big {
    font-size: 2.2rem;
    font-weight: 800;
    line-height: 1.1;
  }
  .cap {
    max-width: 96px;
    color: var(--on-surface-var);
    font-size: 0.75rem;
    line-height: 1.2;
  }
  .pct {
    margin-top: 2px;
    font-size: 0.9rem;
    font-weight: 700;
  }
  .chip {
    padding: 5px 14px;
    border-radius: 20px;
    font-size: 0.82rem;
    font-weight: 600;
  }
  .chip.vis {
    background: color-mix(in srgb, var(--map-visited) 14%, transparent);
    color: var(--map-visited);
  }
  .chip.wish {
    background: color-mix(in srgb, var(--map-wishlist) 14%, transparent);
    color: var(--map-wishlist);
  }
  .info {
    position: absolute;
    top: 6px;
    right: 8px;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 50%;
    background: none;
    color: var(--on-surface-var);
    font-size: 1.1rem;
    cursor: pointer;
  }
  .empty {
    display: flex;
    flex-direction: column;
    gap: 6px;
    text-align: center;
    color: var(--on-surface-var);
  }
  .empty strong {
    color: var(--on-surface);
    font-size: 1.1rem;
  }
  .dots {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 0 0 12px;
  }
  .dot {
    width: 7px;
    height: 7px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: var(--border);
    cursor: pointer;
  }
  .dot.on {
    width: 9px;
    height: 9px;
    background: var(--primary);
  }
  .card {
    margin-bottom: 10px;
    padding: 12px 16px;
    border-radius: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
  }
  .head {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0;
    border: none;
    background: none;
    color: var(--on-surface);
    font: inherit;
    cursor: pointer;
  }
  .head.static {
    cursor: default;
  }
  .name {
    flex: 1;
    text-align: left;
    font-weight: 600;
  }
  .count {
    padding: 1px 8px;
    border-radius: 999px;
    color: #fff;
    font-size: 0.78rem;
    font-weight: 700;
  }
  .count.vis {
    background: var(--map-visited);
  }
  .count.wish {
    background: var(--map-wishlist);
  }
  .of {
    color: var(--on-surface-var);
    font-size: 0.82rem;
  }
  .pctv {
    min-width: 2.4em;
    text-align: right;
    color: var(--map-visited);
    font-size: 0.78rem;
    font-weight: 700;
  }
  .chev {
    color: var(--on-surface-var);
    transition: transform 0.2s;
  }
  .chev.up {
    transform: rotate(180deg);
  }
  .bar {
    position: relative;
    height: 6px;
    margin-top: 8px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--border) 60%, transparent);
    overflow: hidden;
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: 3px;
  }
  .wishfill {
    background: color-mix(in srgb, var(--map-wishlist) 45%, transparent);
  }
  .visfill {
    background: var(--map-visited);
  }
  .region + .region {
    margin-top: 14px;
  }
  .list {
    margin-top: 10px;
    padding-top: 4px;
    border-top: 1px solid var(--border);
  }
  .list h3 {
    margin: 10px 0 4px;
    font-size: 0.78rem;
  }
  .list h3.vis {
    color: var(--map-visited);
  }
  .list h3.wish {
    color: var(--map-wishlist);
  }
  .row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 4px;
    border: none;
    background: none;
    color: var(--on-surface);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .row:hover {
    background: var(--surface-variant);
  }
  .flag {
    width: 1.8rem;
    text-align: center;
    font-size: 1.25rem;
  }
  .rflag {
    display: inline-block;
    width: 1.9rem;
    font-size: 1.15rem;
  }
  .none {
    margin: 10px 0 0;
    color: var(--on-surface-var);
    font-size: 0.9rem;
  }
  .cities {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .hint {
    flex-basis: 100%;
    margin: 4px 0 0;
    color: var(--on-surface-var);
    font-size: 0.8rem;
  }
  .scrim {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.45);
    z-index: 20;
  }
  .dialog {
    position: fixed;
    z-index: 21;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(92vw, 440px);
    max-height: 85vh;
    overflow-y: auto;
    padding: 20px;
    border-radius: 18px;
    background: var(--surface);
    color: var(--on-surface);
    box-shadow: 0 8px 32px rgb(0 0 0 / 0.4);
  }
  .dialog h3 {
    margin: 0 0 10px;
    font-size: 1.1rem;
  }
  .dialog p {
    margin: 0 0 14px;
    white-space: pre-line;
    line-height: 1.5;
    color: var(--on-surface-var);
  }
</style>
