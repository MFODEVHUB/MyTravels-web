<script lang="ts">
  import { store } from '../lib/store.svelte'
  import { TERRITORY_BY_CODE, territoryName } from '../lib/territories'
  import type { Selection, VisitStatus } from '../lib/types'

  let { selection, onclose }: { selection: Selection; onclose: () => void } = $props()

  /**
   * Sur mobile, le navigateur envoie un "clic fantôme" à l'élément qui se trouve sous le doigt une fois le tap
   * traité : la fiche vient d'apparaître, c'est donc son fond qui le reçoit et la referme aussitôt. On ignore
   * les clics du fond pendant ce court délai.
   */
  const GHOST_CLICK_MS = 450
  let openedAt = performance.now()
  $effect(() => {
    void selection
    openedAt = performance.now()
  })
  const onScrimClick = () => {
    if (performance.now() - openedAt > GHOST_CLICK_MS) onclose()
  }

  const STATUSES: VisitStatus[] = ['VISITED', 'WISHLIST', 'NONE']

  const code = $derived(selection.country)
  const region = $derived(selection.region)
  const territory = $derived(TERRITORY_BY_CODE.get(code))
  const current = $derived((store.rev, region ? store.regionStatus(region.code) : store.statusOf(code)))
  const visitedAt = $derived((store.rev, store.state.countries[code]?.visitedAt))
  const title = $derived(
    region ? (store.lang === 'fr' ? region.nameFr : region.nameEn) : territory ? territoryName(territory, store.lang) : code,
  )
  const subtitle = $derived(
    region && territory ? territoryName(territory, store.lang) : territory ? store.t(`continent.${territory.continent}` as never) : '',
  )

  const setStatus = (s: VisitStatus) => (region ? store.setRegionStatus(region.code, s) : store.setStatus(code, s))

  /** yyyy-mm-dd en date locale, pour <input type="date">. */
  const toInputValue = (ms: number) => {
    const d = new Date(ms)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function onDateChange(e: Event) {
    const value = (e.currentTarget as HTMLInputElement).value
    if (!value) return store.setVisitedAt(code, undefined)
    const [y, m, d] = value.split('-').map(Number)
    // Midi local : évite qu'un décalage de fuseau fasse glisser la date d'un jour.
    store.setVisitedAt(code, new Date(y, m - 1, d, 12).getTime())
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose()
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if territory}
  <div class="scrim" onclick={onScrimClick} role="presentation"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
    <div class="grab" aria-hidden="true"></div>
    <header>
      <span class="flag" aria-hidden="true">{territory.flag}</span>
      <div class="title">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <button class="close" aria-label={store.t('sheet.close')} onclick={onclose}>×</button>
    </header>

    <div class="segmented" role="group">
      {#each STATUSES as s (s)}
        <button class:active={current === s} class={s} aria-pressed={current === s} onclick={() => setStatus(s)}>
          {store.t(`status.${s}` as never)}
        </button>
      {/each}
    </div>

    {#if !region && current === 'VISITED'}
      <label class="date">
        <span>{store.t('sheet.visitedOn')}</span>
        <span class="date-row">
          <input type="date" value={visitedAt != null ? toInputValue(visitedAt) : ''} max={toInputValue(Date.now())} onchange={onDateChange} />
          {#if visitedAt != null}
            <button type="button" class="link" onclick={() => store.setVisitedAt(code, undefined)}>{store.t('sheet.clearDate')}</button>
          {/if}
        </span>
      </label>
    {/if}
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.4);
    z-index: 10;
  }
  .sheet {
    position: fixed;
    z-index: 11;
    left: 0;
    right: 0;
    bottom: 0;
    max-width: 520px;
    margin: 0 auto;
    padding: 8px 20px calc(20px + env(safe-area-inset-bottom));
    background: var(--surface);
    color: var(--on-surface);
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -4px 24px rgb(0 0 0 / 0.3);
    animation: up 0.18s ease-out;
  }
  @keyframes up {
    from {
      transform: translateY(30%);
      opacity: 0;
    }
  }
  .grab {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: var(--border);
    margin: 0 auto 12px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
  }
  .flag {
    font-size: 2.4rem;
    line-height: 1;
  }
  .title {
    flex: 1;
    min-width: 0;
  }
  h2 {
    margin: 0;
    font-size: 1.25rem;
  }
  p {
    margin: 2px 0 0;
    color: var(--on-surface-var);
    font-size: 0.9rem;
  }
  .close {
    border: none;
    background: none;
    color: var(--on-surface-var);
    font-size: 1.8rem;
    line-height: 1;
    cursor: pointer;
    padding: 4px 8px;
  }
  .segmented {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .segmented button {
    padding: 12px 6px;
    border-radius: 12px;
    border: 1.5px solid var(--border);
    background: var(--surface-variant);
    color: var(--on-surface);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  .segmented button.active.VISITED {
    background: var(--map-visited);
    border-color: var(--map-visited);
    color: #fff;
  }
  .segmented button.active.WISHLIST {
    background: var(--map-wishlist);
    border-color: var(--map-wishlist);
    color: #fff;
  }
  .segmented button.active.NONE {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--on-primary);
  }
  .date {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 18px;
    font-weight: 600;
    font-size: 0.9rem;
  }
  .date-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  input[type='date'] {
    font: inherit;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1.5px solid var(--border);
    background: var(--surface-variant);
    color: var(--on-surface);
  }
  .link {
    border: none;
    background: none;
    color: var(--primary);
    font: inherit;
    cursor: pointer;
    text-decoration: underline;
  }
</style>
