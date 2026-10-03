<script lang="ts">
  /** Anneau de progression (0–1), départ en haut, sens horaire. */
  let { progress, color }: { progress: number; color: string } = $props()

  const R = 58
  const C = 2 * Math.PI * R
  const clamped = $derived(Math.min(1, Math.max(0, progress)))
</script>

<svg viewBox="0 0 140 140" width="148" height="148" aria-hidden="true">
  <circle cx="70" cy="70" r={R} fill="none" stroke="var(--border)" stroke-width="11" />
  <circle
    cx="70"
    cy="70"
    r={R}
    fill="none"
    stroke={color}
    stroke-width="11"
    stroke-linecap="round"
    stroke-dasharray="{C}"
    stroke-dashoffset={C * (1 - clamped)}
    transform="rotate(-90 70 70)"
    style="transition: stroke-dashoffset 0.5s ease"
  />
</svg>
