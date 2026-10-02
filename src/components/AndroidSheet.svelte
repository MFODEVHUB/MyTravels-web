<script lang="ts">
  import qrcode from 'qrcode-generator'
  import { playUrl } from '../config'
  import { store } from '../lib/store.svelte'
  import { promoEnv } from '../lib/promoEnv'

  let {
    variant,
    onclose,
    onnever,
  }: { variant: 'promo' | 'stats'; onclose: () => void; onnever?: () => void } = $props()

  const env = promoEnv()
  const medium = $derived(variant === 'stats' ? 'stats' : env.device === 'desktop' ? 'qr' : 'pill')
  const url = $derived(playUrl(medium))
  /** Android : bouton direct ; ordinateur : QR code ; iPhone et autres : rien à installer. */
  const cta = $derived(!env.storePublic ? 'soon' : env.device === 'android' ? 'link' : env.device === 'desktop' ? 'qr' : 'none')

  const qrSvg = $derived.by(() => {
    if (cta !== 'qr') return ''
    const qr = qrcode(0, 'M')
    qr.addData(url)
    qr.make()
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true })
  })

  // Un clic fantôme tactile ne doit pas fermer une fenêtre qui vient d'apparaître.
  const openedAt = performance.now()
  const onScrim = () => {
    if (performance.now() - openedAt > 450) onclose()
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div class="scrim" onclick={onScrim} role="presentation"></div>
<div class="dialog" role="dialog" aria-modal="true" aria-label={variant === 'stats' ? store.t('stats.title') : store.t('promo.title')}>
  <div class="head">
    <img src="{import.meta.env.BASE_URL}icons/icon-192.png" alt="" width="52" height="52" />
    <h2>{variant === 'stats' ? store.t('stats.title') : store.t('promo.title')}</h2>
  </div>

  {#if variant === 'stats'}
    <p class="text">{env.storePublic ? store.t('stats.teaserLive') : store.t('stats.teaser')}</p>
  {:else}
    <p class="text">{store.t('apk.intro')}</p>
    <ul>
      <li>{store.t('apk.points.badges')}</li>
      <li>{store.t('apk.points.stats')}</li>
      <li>{store.t('apk.points.share')}</li>
    </ul>
  {/if}

  {#if cta === 'link'}
    <a class="cta" href={url} target="_blank" rel="noopener">▶ {store.t('apk.install')}</a>
  {:else if cta === 'qr'}
    <div class="qr">
      <div class="qr-box" aria-hidden="true">{@html qrSvg}</div>
      <p class="scan">{store.t('apk.scan')}</p>
      <a class="alt" href={url} target="_blank" rel="noopener">{store.t('apk.install')}</a>
    </div>
  {:else if cta === 'soon'}
    <span class="cta soon">▶ {store.t('promo.soon')}</span>
  {/if}

  <div class="foot">
    <button class="link" onclick={onclose}>{store.t('apk.later')}</button>
    {#if onnever}<button class="link" onclick={onnever}>{store.t('apk.never')}</button>{/if}
  </div>
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
    width: min(92vw, 400px);
    max-height: 90vh;
    overflow-y: auto;
    padding: 20px;
    border-radius: 18px;
    background: var(--surface);
    color: var(--on-surface);
    box-shadow: 0 8px 32px rgb(0 0 0 / 0.4);
    animation: pop 0.2s ease-out;
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: translate(-50%, -46%) scale(0.97);
    }
  }
  .head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .head img {
    border-radius: 12px;
    background: #fff;
  }
  h2 {
    margin: 0;
    font-size: 1.15rem;
  }
  .text {
    margin: 0 0 8px;
    color: var(--on-surface-var);
    line-height: 1.45;
  }
  ul {
    margin: 0 0 14px 1.2rem;
    padding: 0;
    line-height: 1.5;
  }
  .cta {
    display: block;
    margin: 14px 0 4px;
    padding: 11px 16px;
    border-radius: 12px;
    background: var(--primary);
    color: var(--on-primary);
    font-weight: 700;
    text-align: center;
    text-decoration: none;
  }
  .cta.soon {
    background: var(--surface-variant);
    color: var(--on-surface-var);
    border: 1.5px dashed var(--border);
  }
  .qr {
    margin: 14px 0 4px;
    text-align: center;
  }
  .qr-box {
    display: inline-block;
    width: 168px;
    padding: 6px;
    border-radius: 12px;
    background: #fff;
    line-height: 0;
  }
  .scan {
    margin: 8px 0 4px;
    color: var(--on-surface-var);
    font-size: 0.85rem;
    line-height: 1.35;
  }
  .alt {
    color: var(--primary);
    font-size: 0.9rem;
  }
  .foot {
    display: flex;
    justify-content: center;
    gap: 18px;
    margin-top: 12px;
  }
  .link {
    padding: 4px;
    border: none;
    background: none;
    color: var(--on-surface-var);
    font: inherit;
    font-size: 0.85rem;
    text-decoration: underline;
    cursor: pointer;
  }
</style>
