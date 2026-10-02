<script lang="ts">
  import { onMount } from 'svelte'
  import AndroidPromo from './AndroidPromo.svelte'
  import ImportDialog from './ImportDialog.svelte'
  import SyncCard from './SyncCard.svelte'
  import { BackupError, exportBackup, parseBackup } from '../lib/backup'
  import { applyImport, diffStates, type ImportMode } from '../lib/merge'
  import { store } from '../lib/store.svelte'
  import { sync } from '../lib/sync.svelte'
  import { emptyState, type AppState, type Lang, type ThemePref } from '../lib/types'

  const FEEDBACK_EMAIL = 'mfodevhub@gmail.com'

  let message = $state<{ text: string; error: boolean } | null>(null)
  let persisted = $state<boolean | null>(null)
  let fileInput: HTMLInputElement
  let incoming = $state<AppState | null>(null)

  onMount(async () => {
    try {
      persisted = (await navigator.storage?.persisted?.()) ?? null
    } catch {
      persisted = null
    }
  })

  async function protectStorage() {
    try {
      persisted = (await navigator.storage?.persist?.()) ?? false
    } catch {
      persisted = false
    }
  }

  function doExport() {
    const blob = new Blob([exportBackup($state.snapshot(store.state))], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mytravels-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    message = { text: store.t('settings.exported'), error: false }
  }

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    try {
      incoming = parseBackup(await file.text())
      message = null
    } catch (err) {
      const reason = err instanceof BackupError ? err.message : 'invalid-format'
      message = { text: store.t(`settings.importError.${reason}` as never), error: true }
    }
  }

  function doImport(mode: ImportMode) {
    if (!incoming) return
    const before = store.snapshot()
    const next = applyImport(before, incoming, mode, Date.now())
    const diff = diffStates(before, next)
    store.replaceAll(next)
    incoming = null
    message = {
      text: store.t(mode === 'merge' ? 'settings.importedMerge' : 'settings.imported', {
        n: mode === 'merge' ? diff.countries : Object.values(next.countries).filter((c) => c.status === 'VISITED').length,
        m: diff.regions,
      }),
      error: false,
    }
  }

  /** Effacer = importer du vide en mode "remplacer" : les suppressions sont datées, donc propagées par la sync. */
  function doReset() {
    const text = sync.status === 'off' ? store.t('settings.resetConfirm') : store.t('settings.resetConfirmSync')
    if (confirm(text)) {
      store.replaceAll(applyImport(store.snapshot(), emptyState(), 'replace', Date.now()))
      message = null
    }
  }

  const langs: { value: Lang | 'auto'; label: () => string }[] = [
    { value: 'auto', label: () => store.t('settings.languageAuto') },
    { value: 'fr', label: () => 'Français' },
    { value: 'en', label: () => 'English' },
  ]
  const themes: { value: ThemePref; label: () => string }[] = [
    { value: 'auto', label: () => store.t('settings.themeAuto') },
    { value: 'light', label: () => store.t('settings.themeLight') },
    { value: 'dark', label: () => store.t('settings.themeDark') },
  ]
</script>

<div class="page">
  <h1>{store.t('settings.title')}</h1>

  <AndroidPromo />

  {#if sync.available}
    <SyncCard />
  {/if}

  <section>
    <h2>{store.t('settings.language')}</h2>
    <div class="seg" role="group">
      {#each langs as l (l.value)}
        <button class:active={store.prefs.lang === l.value} aria-pressed={store.prefs.lang === l.value} onclick={() => store.setLang(l.value)}>{l.label()}</button>
      {/each}
    </div>
  </section>

  <section>
    <h2>{store.t('settings.theme')}</h2>
    <div class="seg" role="group">
      {#each themes as th (th.value)}
        <button class:active={store.prefs.theme === th.value} aria-pressed={store.prefs.theme === th.value} onclick={() => store.setTheme(th.value)}>{th.label()}</button>
      {/each}
    </div>
  </section>

  <section>
    <h2>{store.t('settings.data')}</h2>
    <p class="hint">{store.t('settings.dataHint')}</p>
    <div class="actions">
      <button class="btn primary" onclick={doExport}>{store.t('settings.export')}</button>
      <button class="btn" onclick={() => fileInput.click()}>{store.t('settings.import')}</button>
      <input bind:this={fileInput} type="file" accept="application/json,.json" hidden onchange={onFile} />
    </div>
    <p class="hint small">{store.t('settings.importHint')}</p>
    {#if message}
      <p class="msg" class:error={message.error} role="status">{message.text}</p>
    {/if}
    {#if persisted === false}
      <p class="hint small">
        {store.t('settings.persist.denied')}
        <button class="link" onclick={protectStorage}>{store.t('settings.persist.action')}</button>
      </p>
    {:else if persisted}
      <p class="hint small">{store.t('settings.persist.granted')}</p>
    {/if}
    <button class="btn danger" onclick={doReset}>{store.t('settings.reset')}</button>
  </section>

  <section>
    <h2>{store.t('settings.about')}</h2>
    <p class="hint">{store.t('settings.aboutText')}</p>
    <p class="hint"><a href="mailto:{FEEDBACK_EMAIL}">{store.t('settings.feedback')}</a></p>
    <p class="hint small version">{store.t('settings.version', { v: __APP_VERSION__ })}</p>
  </section>
</div>

{#if incoming}
  <ImportDialog {incoming} onchoose={doImport} oncancel={() => (incoming = null)} />
{/if}

<style>
  .page {
    max-width: 720px;
    margin: 0 auto;
    padding: calc(16px + env(safe-area-inset-top)) 16px 24px;
  }
  h1 {
    margin: 0 0 8px;
    font-size: 1.5rem;
  }
  h2 {
    margin: 24px 0 8px;
    color: var(--on-surface-var);
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .seg {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .seg button {
    padding: 9px 16px;
    border-radius: 12px;
    border: 1.5px solid var(--border);
    background: var(--surface);
    color: var(--on-surface);
    font: inherit;
    cursor: pointer;
  }
  .seg button.active {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--on-primary);
  }
  .hint {
    margin: 0 0 12px;
    color: var(--on-surface-var);
    line-height: 1.45;
  }
  .hint.small {
    font-size: 0.85rem;
    margin: 8px 0;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
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
  .danger {
    margin-top: 16px;
    color: var(--map-wishlist);
    border-color: var(--map-wishlist);
  }
  .link {
    border: none;
    background: none;
    color: var(--primary);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  a {
    color: var(--primary);
  }
</style>
