<script lang="ts">
  import { onMount } from 'svelte'
  import { loadMap, MAP_H, MAP_W, type MapShape, type RegionShape } from '../lib/geo'
  import { store } from '../lib/store.svelte'
  import SyncChip from './SyncChip.svelte'
  import { computeStats } from '../lib/stats'
  import { TERRITORY_BY_CODE, territoryName } from '../lib/territories'
  import type { Selection } from '../lib/types'

  let {
    selection = null,
    onselect,
    onsettings,
  }: { selection?: Selection | null; onselect: (s: Selection) => void; onsettings?: () => void } = $props()

  const MAX_ZOOM = 40
  /** Même longitude centrale initiale que l'app Android (Europe/Afrique au centre). */
  const INITIAL_LON = 15
  /** Distance (px écran) sous laquelle un tap "raté" sur une petite entité est rattaché à la plus proche. */
  const TAP_SNAP_PX = 16
  const SMALL_SHAPE_AREA = 40 // unités carte² : en dessous, l'entité est difficile à viser
  /** Un nom de pays n'est affiché que si l'entité fait au moins cette largeur à l'écran (px CSS). */
  const MIN_LABEL_WIDTH_PX = 18
  /** Zoom relatif (1 = vue d'ensemble) à partir duquel les régions deviennent visibles/touchables hors vue Régions. */
  const REGION_BORDERS_ZOOM = 1.2
  const REGION_LABELS_ZOOM = 5.5
  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

  type ViewMode = 'countries' | 'regions'
  type Bounds = { bounds: [[number, number], [number, number]] }

  let wrap: HTMLDivElement
  let canvas: HTMLCanvasElement
  let countries: MapShape[] = []
  /** Pays classés du plus grand au plus petit : les grandes entités ont priorité pour leur nom. */
  let labelOrder: MapShape[] = []
  let regions: RegionShape[] = []
  let regionLabelOrder: RegionShape[] = []
  let status = $state<'loading' | 'ready' | 'error'>('loading')
  let errorDetail = $state('')
  let mode = $state<ViewMode>('countries')
  let width = 0
  let height = 0
  let dpr = 1
  /** Transformation carte → écran : x = tx + k·mx, y = ty + k·my. */
  let view = { k: 1, tx: 0, ty: 0 }
  let hitCtx: CanvasRenderingContext2D
  let raf = 0

  const stats = $derived((store.rev, computeStats(store.state)))

  const fitK = () => Math.max(width / MAP_W, height / MAP_H, 0.01)
  const zoomRel = () => view.k / fitK()
  const bboxWidth = (s: Bounds) => s.bounds[1][0] - s.bounds[0][0]
  const area = (s: Bounds) => bboxWidth(s) * (s.bounds[1][1] - s.bounds[0][1])

  function clampView() {
    const minK = fitK()
    view.k = Math.min(Math.max(view.k, minK), MAX_ZOOM * minK)
    const worldPx = MAP_W * view.k
    view.tx = ((view.tx % worldPx) - worldPx) % worldPx
    const mapPx = MAP_H * view.k
    view.ty = mapPx <= height ? (height - mapPx) / 2 : Math.min(0, Math.max(height - mapPx, view.ty))
  }

  function resetView() {
    const k = fitK()
    view = { k, tx: width / 2 - (k * MAP_W * (INITIAL_LON + 180)) / 360, ty: 0 }
    clampView()
    scheduleDraw()
  }

  function zoomAt(factor: number, cx: number, cy: number) {
    const k = Math.min(Math.max(view.k * factor, fitK()), MAX_ZOOM * fitK())
    const real = k / view.k
    view.tx = cx - (cx - view.tx) * real
    view.ty = cy - (cy - view.ty) * real
    view.k = k
    clampView()
    scheduleDraw()
  }

  const css = (name: string) => getComputedStyle(wrap).getPropertyValue(name).trim()

  function scheduleDraw() {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      draw()
    })
  }

  // ── Dessin ────────────────────────────────────────────────────────────────
  const widthCache = new Map<string, number>()
  function textWidth(ctx: CanvasRenderingContext2D, text: string): number {
    const key = ctx.font + '|' + text
    let w = widthCache.get(key)
    if (w === undefined) {
      w = ctx.measureText(text).width
      widthCache.set(key, w)
    }
    return w
  }

  type Box = { x0: number; y0: number; x1: number; y1: number }
  const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0

  function draw() {
    if (!canvas || status !== 'ready' || width === 0) return
    const ctx = canvas.getContext('2d')!
    const colors = {
      sea: css('--map-sea'),
      border: css('--map-border'),
      none: css('--map-none'),
      VISITED: css('--map-visited'),
      WISHLIST: css('--map-wishlist'),
      highlight: css('--map-highlight'),
    }
    const regionsMode = mode === 'regions'
    const rel = zoomRel()
    const showRegionBorders = regionsMode || rel >= REGION_BORDERS_ZOOM
    const regionStatus = new Map(store.state.regions.map((r) => [r.code, r.status]))
    const selRegion = selection?.region?.code
    const sel = selection ? countries.find((s) => s.code === selection.country) : undefined

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = colors.sea
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const { k, ty } = view
    const worldPx = MAP_W * k
    ctx.lineJoin = 'round'
    const firstTile = Math.floor(-view.tx / worldPx)
    const lastTile = Math.ceil((width - view.tx) / worldPx)
    for (let i = firstTile; i <= lastTile; i++) {
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (view.tx + i * worldPx), dpr * ty)
      ctx.lineWidth = 0.7 / k
      ctx.strokeStyle = colors.border
      for (const s of countries) {
        const st = store.state.countries[s.code]?.status
        ctx.fillStyle = st === 'VISITED' ? colors.VISITED : st === 'WISHLIST' ? colors.WISHLIST : colors.none
        ctx.fill(s.path)
        ctx.stroke(s.path)
      }

      // Régions : colorées par-dessus leur pays, bordures dès qu'on zoome (ou en vue Régions).
      ctx.lineWidth = 0.45 / k
      for (const r of regions) {
        const st = regionStatus.get(r.code)
        if (st === 'VISITED' || st === 'WISHLIST') {
          ctx.fillStyle = st === 'VISITED' ? colors.VISITED : colors.WISHLIST
          ctx.fill(r.path)
        }
        if (showRegionBorders) {
          ctx.globalAlpha = 0.75
          ctx.stroke(r.path)
          ctx.globalAlpha = 1
        }
      }

      ctx.lineWidth = 2.4 / k
      ctx.strokeStyle = colors.highlight
      if (sel && !selRegion) ctx.stroke(sel.path)
      if (selRegion) {
        const r = regions.find((x) => x.code === selRegion)
        if (r) ctx.stroke(r.path)
      }
    }

    drawLabels(ctx, regionsMode, rel, firstTile, lastTile)
  }

  function drawLabels(ctx: CanvasRenderingContext2D, regionsMode: boolean, rel: number, firstTile: number, lastTile: number) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    const { k, tx, ty } = view
    const worldPx = MAP_W * k
    const occupied: Box[] = []

    const place = (cx: number, cy: number, w: number, size: number): Box | null => {
      const box = { x0: cx - w / 2 - 3, y0: cy - size, x1: cx + w / 2 + 3, y1: cy + 4 }
      return occupied.some((o) => overlaps(o, box)) ? null : box
    }

    const countryLabels = () => {
      // Seuls les pays sont nommés : le nom d'un archipel éparpillé (îles Sandwich du Sud…) flotterait en plein océan.
      ctx.font = `700 11px ${FONT}`
      ctx.fillStyle = '#fff'
      ctx.shadowColor = 'rgba(0, 0, 0, 0.67)'
      ctx.shadowBlur = 2 * dpr
      ctx.globalAlpha = regionsMode ? 0.27 : 1
      for (const s of labelOrder) {
        if (bboxWidth(s) * k < MIN_LABEL_WIDTH_PX) continue
        const territory = TERRITORY_BY_CODE.get(s.code)
        if (territory?.type !== 'COUNTRY') continue
        const name = territoryName(territory, store.lang)
        const w = textWidth(ctx, name)
        for (let i = firstTile; i <= lastTile; i++) {
          const sx = tx + i * worldPx + s.labelPoint[0] * k
          const sy = ty + s.labelPoint[1] * k + 11 * 0.35
          if (sx < -80 || sx > width + 80 || sy < -20 || sy > height + 20) continue
          const box = place(sx, sy, w, 11)
          if (!box) continue
          ctx.fillText(name, sx, sy)
          occupied.push(box)
        }
      }
      ctx.shadowBlur = 0
      ctx.shadowColor = 'transparent'
    }

    // Noms de régions : tout de suite en vue Régions, sinon seulement très zoomé.
    const regionLabels = () => {
      if (!regions.length || !(regionsMode || rel >= REGION_LABELS_ZOOM)) return
      const size = regionsMode ? 11 : 9
      ctx.font = `700 ${size}px ${FONT}`
      ctx.lineJoin = 'round'
      ctx.lineWidth = 2.2
      ctx.globalAlpha = regionsMode ? 1 : 0.8
      const textColor = store.dark ? '#bfe3ff' : '#0a3d66'
      const haloColor = store.dark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)'
      for (const r of regionLabelOrder) {
        const name = store.lang === 'fr' ? r.nameFr : r.nameEn
        const w = textWidth(ctx, name)
        for (let i = firstTile; i <= lastTile; i++) {
          const sx = tx + i * worldPx + r.labelPoint[0] * k
          const sy = ty + r.labelPoint[1] * k + size * 0.35
          if (sx < -20 || sx > width + 20 || sy < -10 || sy > height + 10) continue
          const box = place(sx, sy, w, size)
          if (!box) continue
          ctx.strokeStyle = haloColor
          ctx.strokeText(name, sx, sy)
          ctx.fillStyle = textColor
          ctx.fillText(name, sx, sy)
          occupied.push(box)
        }
      }
    }

    // En vue Régions, ce sont les régions le sujet : elles se placent avant les noms de pays (estompés).
    if (regionsMode) {
      regionLabels()
      countryLabels()
    } else {
      countryLabels()
      regionLabels()
    }
    ctx.globalAlpha = 1
  }

  // ── Sélection au tap ───────────────────────────────────────────────────────
  /** Région sous le point carte (mx, my), le cas échéant. */
  function regionAt(mx: number, my: number): RegionShape | undefined {
    for (const r of regions) {
      const [[x0, y0], [x1, y1]] = r.bounds
      if (mx < x0 || mx > x1 || my < y0 || my > y1) continue
      if (hitCtx.isPointInPath(r.path, mx, my)) return r
    }
    return undefined
  }

  /** Entité sous le point écran (x, y), avec repli sur la plus proche petite entité. */
  function pick(x: number, y: number): Selection | null {
    const mx = ((((x - view.tx) / view.k) % MAP_W) + MAP_W) % MAP_W
    const my = (y - view.ty) / view.k
    if (my < 0 || my > MAP_H) return null
    hitCtx.setTransform(1, 0, 0, 1, 0, 0)

    // Les régions ont priorité sur le pays quand elles sont visibles, comme dans l'app Android.
    if (mode === 'regions' || zoomRel() >= REGION_BORDERS_ZOOM) {
      const r = regionAt(mx, my)
      if (r) return { country: r.countryCode, region: { code: r.code, nameEn: r.nameEn, nameFr: r.nameFr } }
    }

    // La plus petite entité gagne : sinon un grand voisin qui "avale" une enclave l'emporterait toujours.
    let exact: MapShape | undefined
    for (const s of countries) {
      if (s.selectable && hitCtx.isPointInPath(s.path, mx, my) && (!exact || area(s) < area(exact))) exact = s
    }
    if (exact) return { country: exact.code }

    let nearest: MapShape | undefined
    let nearestDist = TAP_SNAP_PX
    for (const s of countries) {
      if (!s.selectable || area(s) > SMALL_SHAPE_AREA) continue
      let dx = Math.abs(s.centroid[0] - mx)
      dx = Math.min(dx, MAP_W - dx)
      const d = Math.hypot(dx, s.centroid[1] - my) * view.k
      if (d < nearestDist) {
        nearest = s
        nearestDist = d
      }
    }
    return nearest ? { country: nearest.code } : null
  }

  // ── Gestes : un doigt = déplacer, deux doigts = pincer, molette = zoom, double-clic = zoom ──
  const pointers = new Map<number, { x: number; y: number }>()
  let pinchDist = 0
  let downAt = { x: 0, y: 0, t: 0, slop: 6 }
  let moved = false

  function localXY(e: PointerEvent | MouseEvent | WheelEvent) {
    const r = canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function onPointerDown(e: PointerEvent) {
    try {
      canvas.setPointerCapture(e.pointerId)
    } catch {
      /* capture impossible (pointeur déjà libéré) : le geste continue sans */
    }
    const p = localXY(e)
    pointers.set(e.pointerId, p)
    if (pointers.size === 1) {
      // Un doigt bouge toujours un peu pendant un tap : tolérance plus large qu'à la souris.
      downAt = { ...p, t: performance.now(), slop: e.pointerType === 'touch' ? 12 : 6 }
      moved = false
    } else {
      moved = true
      const [a, b] = [...pointers.values()]
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }

  function onPointerMove(e: PointerEvent) {
    const prev = pointers.get(e.pointerId)
    if (!prev) return
    const p = localXY(e)
    pointers.set(e.pointerId, p)
    if (pointers.size === 1) {
      if (Math.hypot(p.x - downAt.x, p.y - downAt.y) > downAt.slop) moved = true
      if (moved) {
        view.tx += p.x - prev.x
        view.ty += p.y - prev.y
        clampView()
        scheduleDraw()
      }
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinchDist > 0) zoomAt(dist / pinchDist, (a.x + b.x) / 2, (a.y + b.y) / 2)
      pinchDist = dist
    }
  }

  function onPointerUp(e: PointerEvent) {
    const wasSingle = pointers.size === 1
    const p = pointers.get(e.pointerId)
    pointers.delete(e.pointerId)
    pinchDist = 0
    if (e.type === 'pointerup' && wasSingle && p && !moved && performance.now() - downAt.t < 600) {
      const picked = pick(p.x, p.y)
      if (picked) onselect(picked)
    }
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const p = localXY(e)
    zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), p.x, p.y)
  }

  function onDblClick(e: MouseEvent) {
    const p = localXY(e)
    zoomAt(2, p.x, p.y)
  }

  function resize() {
    const r = wrap.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return
    const first = width === 0
    const oldFit = fitK()
    width = r.width
    height = r.height
    dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    if (first) resetView()
    else {
      view.k *= fitK() / oldFit
      clampView()
      scheduleDraw()
    }
  }

  async function load() {
    status = 'loading'
    try {
      const world = await loadMap()
      countries = world.countries
      labelOrder = [...countries].sort((a, b) => area(b) - area(a))
      regions = world.regions
      regionLabelOrder = [...regions].sort((a, b) => bboxWidth(b) - bboxWidth(a))
      status = 'ready'
      if (width === 0) resize()
      scheduleDraw()
    } catch (e) {
      console.error(e)
      errorDetail = e instanceof Error ? e.message : String(e)
      status = 'error'
    }
  }

  onMount(() => {
    hitCtx = document.createElement('canvas').getContext('2d')!
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    void load()
    return () => {
      ro.disconnect()
      canvas.removeEventListener('wheel', onWheel)
      cancelAnimationFrame(raf)
    }
  })

  $effect(() => {
    void store.rev
    void store.dark
    void store.lang
    void selection
    void mode
    scheduleDraw()
  })
</script>

<div class="map" bind:this={wrap}>
  <canvas
    bind:this={canvas}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    ondblclick={onDblClick}
    aria-label="Carte du monde"
  ></canvas>

  {#if status === 'loading'}
    <div class="overlay" role="status"><span class="spinner"></span>{store.t('map.loading')}</div>
  {:else if status === 'error'}
    <div class="overlay">
      {store.t('map.error')}
      <code class="detail">{errorDetail}</code>
      <button class="btn" onclick={load}>{store.t('map.retry')}</button>
    </div>
  {:else}
    <div class="top-left">
      <div class="badge">{store.t('map.visitedCount', { n: stats.visitedCountries })}</div>
      <SyncChip {onsettings} />
    </div>
    <div class="modes" role="group">
      <button class:active={mode === 'countries'} aria-pressed={mode === 'countries'} onclick={() => (mode = 'countries')}>
        {store.t('map.viewCountries')}
      </button>
      <button class:active={mode === 'regions'} aria-pressed={mode === 'regions'} onclick={() => (mode = 'regions')}>
        {store.t('map.viewRegions')}
      </button>
    </div>
    <div class="zoom">
      <button aria-label={store.t('map.zoomIn')} onclick={() => zoomAt(1.6, width / 2, height / 2)}>+</button>
      <button aria-label={store.t('map.zoomOut')} onclick={() => zoomAt(1 / 1.6, width / 2, height / 2)}>−</button>
      <button aria-label={store.t('map.reset')} onclick={resetView}>⌖</button>
    </div>
  {/if}
</div>

<style>
  .map {
    position: relative;
    width: 100%;
    height: 100%;
    background: var(--map-sea);
    overflow: hidden;
    touch-action: none;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: grab;
  }
  canvas:active {
    cursor: grabbing;
  }
  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: center;
    justify-content: center;
    color: var(--on-surface);
    font-weight: 500;
  }
  .detail {
    max-width: 90%;
    color: var(--on-surface-var);
    font-size: 0.75rem;
    text-align: center;
    word-break: break-word;
  }
  .spinner {
    width: 28px;
    height: 28px;
    border: 3px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .top-left {
    position: absolute;
    top: calc(12px + env(safe-area-inset-top));
    left: 12px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .badge {
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--surface);
    color: var(--on-surface);
    font-size: 0.85rem;
    font-weight: 600;
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.25);
  }
  .modes {
    position: absolute;
    top: calc(12px + env(safe-area-inset-top));
    right: 12px;
    display: flex;
    padding: 3px;
    gap: 2px;
    border-radius: 999px;
    background: var(--surface);
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.25);
  }
  .modes button {
    padding: 5px 12px;
    border: none;
    border-radius: 999px;
    background: none;
    color: var(--on-surface);
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }
  .modes button.active {
    background: var(--primary);
    color: var(--on-primary);
  }
  .zoom {
    position: absolute;
    right: 12px;
    bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .zoom button {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: var(--surface);
    color: var(--on-surface);
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.3);
  }
  .zoom button:hover {
    background: var(--surface-variant);
  }
</style>
