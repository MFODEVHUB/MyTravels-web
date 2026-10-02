<script lang="ts">
  import { store } from '../lib/store.svelte'
  import type { ImportMode } from '../lib/merge'
  import type { AppState } from '../lib/types'

  let {
    incoming,
    onchoose,
    oncancel,
  }: { incoming: AppState; onchoose: (mode: ImportMode) => void; oncancel: () => void } = $props()

  const visited = $derived(Object.values(incoming.countries).filter((c) => c.status === 'VISITED').length)
  const regions = $derived(incoming.regions.filter((r) => r.status !== 'NONE').length)

  // Même garde que la fiche pays : un clic fantôme tactile ne doit pas fermer le dialogue qui vient d'apparaître.
  const openedAt = performance.now()
  const onScrim = () => {
    if (performance.now() - openedAt > 450) oncancel()
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && oncancel()} />

<div class="scrim" onclick={onScrim} role="presentation"></div>
<div class="dialog" role="dialog" aria-modal="true" aria-label={store.t('import.title')}>
  <h2>{store.t('import.title')}</h2>
  <p class="summary">{store.t('import.summary', { n: visited, m: regions })}</p>

  <button class="choice primary" onclick={() => onchoose('merge')}>
    <strong>{store.t('import.merge')}</strong>
    <span>{store.t('import.mergeHint')}</span>
  </button>
  <button class="choice" onclick={() => onchoose('replace')}>
    <strong>{store.t('import.replace')}</strong>
    <span>{store.t('import.replaceHint')}</span>
  </button>
  <button class="cancel" onclick={oncancel}>{store.t('common.cancel')}</button>
</div>

<style>
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
    width: min(92vw, 420px);
    padding: 20px;
    border-radius: 18px;
    background: var(--surface);
    color: var(--on-surface);
    box-shadow: 0 8px 32px rgb(0 0 0 / 0.4);
  }
  h2 {
    margin: 0 0 4px;
    font-size: 1.15rem;
  }
  .summary {
    margin: 0 0 16px;
    color: var(--on-surface-var);
    font-size: 0.9rem;
  }
  .choice {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    margin-bottom: 10px;
    padding: 12px 14px;
    border-radius: 12px;
    border: 1.5px solid var(--border);
    background: var(--surface-variant);
    color: var(--on-surface);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .choice span {
    color: var(--on-surface-var);
    font-size: 0.85rem;
  }
  .choice.primary {
    border-color: var(--primary);
  }
  .cancel {
    display: block;
    margin: 4px auto 0;
    padding: 8px 14px;
    border: none;
    background: none;
    color: var(--on-surface-var);
    font: inherit;
    cursor: pointer;
  }
</style>
