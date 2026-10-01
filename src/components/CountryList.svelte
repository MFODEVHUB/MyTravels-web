<script lang="ts">
  import { store } from '../lib/store.svelte'
  import { computeStats } from '../lib/stats'
  import { CONTINENTS, TERRITORIES, normalize, territoryName } from '../lib/territories'
  import type { Territory, VisitStatus } from '../lib/types'

  let { onselect }: { onselect: (code: string) => void } = $props()

  type Filter = 'ALL' | VisitStatus
  const FILTERS: Filter[] = ['ALL', 'VISITED', 'WISHLIST', 'NONE']

  let query = $state('')
  let filter = $state<Filter>('ALL')

  const stats = $derived((store.rev, computeStats(store.state)))

  const groups = $derived.by(() => {
    void store.rev
    const lang = store.lang
    const q = normalize(query.trim())
    const collator = new Intl.Collator(lang, { sensitivity: 'base' })
    const visible = TERRITORIES.filter((t) => {
      if (filter !== 'ALL' && store.statusOf(t.code) !== filter) return false
      return !q || normalize(territoryName(t, lang)).includes(q) || normalize(t.nameEn).includes(q)
    }).sort((a, b) => collator.compare(territoryName(a, lang), territoryName(b, lang)))

    const result: { key: string; label: string; items: Territory[] }[] = []
    for (const c of CONTINENTS) {
      const items = visible.filter((t) => t.type === 'COUNTRY' && t.continent === c)
      if (items.length) result.push({ key: c, label: store.t(`continent.${c}` as never), items })
    }
    const others = visible.filter((t) => t.type !== 'COUNTRY')
    if (others.length) result.push({ key: 'ISL', label: store.t('countries.islands'), items: others })
    return result
  })
</script>

<div class="page">
  <div class="top">
    <h1>{store.t('countries.title')}</h1>
    <span class="count">{store.t('countries.visitedOf', { n: stats.visitedCountries, total: stats.totalCountries })}</span>
  </div>

  <input class="search" type="search" placeholder={store.t('countries.search')} bind:value={query} />

  <div class="chips" role="group">
    {#each FILTERS as f (f)}
      <button class:active={filter === f} aria-pressed={filter === f} onclick={() => (filter = f)}>
        {f === 'ALL' ? store.t('filter.all') : store.t(`status.${f}` as never)}
      </button>
    {/each}
  </div>

  {#each groups as g (g.key)}
    <section>
      <h2>{g.label}</h2>
      <ul>
        {#each g.items as t (t.code)}
          {@const st = store.statusOf(t.code)}
          <li>
            <button class="row" onclick={() => onselect(t.code)}>
              <span class="flag" aria-hidden="true">{t.flag}</span>
              <span class="name">{territoryName(t, store.lang)}</span>
              {#if st !== 'NONE'}
                <span class="pill {st}">{store.t(`status.${st}` as never)}</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <p class="empty">{store.t('countries.empty')}</p>
  {/each}
</div>

<style>
  .page {
    max-width: 720px;
    margin: 0 auto;
    padding: calc(16px + env(safe-area-inset-top)) 16px 24px;
  }
  .top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }
  h1 {
    margin: 0 0 12px;
    font-size: 1.5rem;
  }
  .count {
    color: var(--on-surface-var);
    font-size: 0.9rem;
    font-weight: 600;
  }
  .search {
    width: 100%;
    box-sizing: border-box;
    font: inherit;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1.5px solid var(--border);
    background: var(--surface);
    color: var(--on-surface);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 12px 0 4px;
  }
  .chips button {
    padding: 7px 14px;
    border-radius: 999px;
    border: 1.5px solid var(--border);
    background: var(--surface);
    color: var(--on-surface);
    font: inherit;
    font-size: 0.9rem;
    cursor: pointer;
  }
  .chips button.active {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--on-primary);
  }
  h2 {
    position: sticky;
    top: 0;
    margin: 20px 0 4px;
    padding: 6px 0;
    background: var(--bg);
    color: var(--on-surface-var);
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 11px 6px;
    border: none;
    border-bottom: 1px solid var(--border);
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
    font-size: 1.5rem;
    width: 2rem;
    text-align: center;
  }
  .name {
    flex: 1;
    min-width: 0;
  }
  .pill {
    padding: 3px 10px;
    border-radius: 999px;
    color: #fff;
    font-size: 0.78rem;
    font-weight: 600;
  }
  .pill.VISITED {
    background: var(--map-visited);
  }
  .pill.WISHLIST {
    background: var(--map-wishlist);
  }
  .empty {
    margin-top: 32px;
    text-align: center;
    color: var(--on-surface-var);
  }
</style>
