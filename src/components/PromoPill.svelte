<script lang="ts">
  import { onMount } from 'svelte'
  import AndroidSheet from './AndroidSheet.svelte'
  import { promoEnv } from '../lib/promoEnv'
  import { loadPromo, promoDevices, recordShown, registerVisit, savePromo, shouldShowPromo } from '../lib/promo'
  import { store } from '../lib/store.svelte'

  let { active = true }: { active?: boolean } = $props()

  const env = promoEnv()
  let promo = registerVisit(loadPromo(), Date.now())
  savePromo(promo)

  let visible = $state(false)
  let open = $state(false)
  /** Fermée par l'utilisateur : elle ne revient pas avant la prochaine visite. */
  let closed = false
  let sessionSeconds = 0

  const marked = $derived((store.rev, Object.values(store.state.countries).filter((c) => c.status !== 'NONE').length))

  function check() {
    if (visible || closed) return
    const ctx = { now: Date.now(), device: env.device, storePublic: env.storePublic, countriesMarked: marked, sessionSeconds }
    // `?promo=…` force l'apparition (test), mais jamais pour un appareil à qui on ne propose rien (iPhone).
    if (env.forced ? promoDevices.includes(env.device) && sessionSeconds >= 1 : shouldShowPromo(promo, ctx)) {
      visible = true
      if (!env.forced) {
        promo = recordShown(promo, ctx.now)
        savePromo(promo)
      }
    }
  }

  onMount(() => {
    const timer = setInterval(() => {
      sessionSeconds += 1
      if (sessionSeconds % 5 === 0 || env.forced) check()
    }, 1000)
    return () => clearInterval(timer)
  })

  // Dès que l'usage atteint le seuil (pays marqués), on réévalue sans attendre le prochain tick.
  $effect(() => {
    void marked
    check()
  })

  function never() {
    promo = { ...promo, dismissed: true }
    if (!env.forced) savePromo(promo)
    open = false
    close()
  }

  function close() {
    closed = true
    visible = false
  }
</script>

{#if visible && active}
  <div class="wrap">
    <button class="pill" onclick={() => (open = true)}>
      <span class="ico" aria-hidden="true">📱</span>
      <span>{store.t('apk.pill')}</span>
    </button>
    <button class="x" aria-label={store.t('sheet.close')} onclick={close}>×</button>
  </div>
{/if}

{#if open}
  <AndroidSheet variant="promo" onclose={() => (open = false)} onnever={never} />
{/if}

<style>
  .wrap {
    position: absolute;
    z-index: 4;
    left: 12px;
    bottom: 16px;
    display: flex;
    align-items: center;
    animation: rise 0.45s ease-out;
  }
  .pill {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 16px;
    border: none;
    border-radius: 999px;
    background: var(--primary);
    color: var(--on-primary);
    font: inherit;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.35);
  }
  /* Un seul halo à l'apparition, puis la pastille reste calme. */
  .pill::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow: 0 0 0 0 var(--primary);
    animation: halo 1.4s ease-out 0.5s 2;
    pointer-events: none;
  }
  .x {
    margin-left: 4px;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 50%;
    background: var(--surface);
    color: var(--on-surface-var);
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.3);
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(14px);
    }
  }
  @keyframes halo {
    0% {
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 55%, transparent);
    }
    100% {
      box-shadow: 0 0 0 14px transparent;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .wrap,
    .pill::after {
      animation: none;
    }
  }
</style>
