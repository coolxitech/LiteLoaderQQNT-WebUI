<script setup lang="ts">
/* Adapted from Inspira UI ShimmerButton.vue (MIT).
   Source: https://github.com/unovue/inspira-ui/blob/main/app/components/inspira/ui/shimmer-button/ShimmerButton.vue
   Upstream: `--spread: 90deg`, `--shimmer-color: #ffffff`, a conic-gradient from
   `calc(270deg - var(--spread) / 2)` (= 225deg) over a blurred `-inset-full` layer, spun with
   `shimmer-btn-spin-around` (`translateZ(0) rotate()`, `calc(var(--speed) * 2)` = 6s, infinite linear)
   plus an inset white `shadow-[inset_0_-8px_10px_#ffffff1f]` metal edge.
   Changed for this project:
   - container-query units dropped (Chrome 100), the spin is a plain 4s linear infinite rotate;
   - upstream buries the shine behind an opaque `inset-(--cut)` cutout, which is why the previous
     build was invisible. The cutout is gone: the conic now paints over the primary button surface;
   - to protect label contrast the shine is masked away from the middle 12px label band of the button
     (see the mask on .inspira-shimmer), so the sheen only ever reads as metal on the top and bottom
     rims and never sits under the glyphs;
   - `mode` is now two-valued. "always" is the original continuous spin; "hover" only spins while the
     button that hosts this layer is itself hovered / keyboard-focused, because a page full of
     simultaneously spinning primary buttons reads as cheap and flattens the visual hierarchy. */
withDefaults(defineProps<{ mode?: "always" | "hover" }>(), { mode: "always" });
</script>
<template>
 <span class="inspira-shimmer" :class="'is-' + mode" aria-hidden="true"><span class="shimmer-sheen"></span></span>
</template>
<style scoped>
/* The mask lives on the button-sized wrapper (not on the 300% sheen) so its percentages are measured
   against the real button box: opaque top/bottom rim, transparent core = the 12px label band of a
   --sm/--md button, so the white sheen can never pass under the glyphs. */
.inspira-shimmer {
 position: absolute; inset: 0; border-radius: inherit; overflow: hidden; pointer-events: none; z-index: 0;
 /* Peak alpha of the sheen. Hover mode zeroes it out when idle (see below), so this one knob also
    carries the "invisible at rest" guarantee without repeating the whole declaration list. */
 --shimmer-alpha: .55;
 -webkit-mask-image: linear-gradient(180deg,#000 0 calc(50% - 9px),transparent calc(50% - 6px) calc(50% + 6px),#000 calc(50% + 9px) 100%);
 mask-image: linear-gradient(180deg,#000 0 calc(50% - 9px),transparent calc(50% - 6px) calc(50% + 6px),#000 calc(50% + 9px) 100%);
}
/* Square orbiting layer (padding-bottom resolves against width, so this stays square for any button size).
   A rotating square always contains its inscribed circle of radius 1.5 * width, which is wider than the
   button's half diagonal, so the sheen never drops out at the far corners. */
.shimmer-sheen {
 position: absolute; left: 50%; top: 50%; width: 300%; height: 0; padding-bottom: 300%;
 background: conic-gradient(from 225deg,transparent 0deg,rgba(255,255,255,.10) 40deg,rgba(255,255,255,.95) 78deg,rgba(255,255,255,.10) 116deg,transparent 156deg);
 opacity: var(--shimmer-alpha);
 transform: translate(-50%,-50%) rotate(0deg);
 will-change: transform;
 animation: shimmer-sweep 4s linear infinite;
 transition: opacity 180ms linear;
}
/* Hover mode: fully transparent *and* paused while idle. Transparency is not optional — pausing alone
   freezes the conic at some arbitrary angle and leaves a static diagonal highlight across the button,
   which is exactly the artifact the last review rejected. */
.is-hover .shimmer-sheen { opacity: 0; animation-play-state: paused; }
/* Only the hosting control's own hover / keyboard focus may light the sheen, and never while disabled.
   Scope compilation only appends the data attribute to .shimmer-sheen, so the ancestor conditions are
   evaluated against the real DOM (the <button> in Button.vue) — no coupling to the parent's scope id. */
:is(:hover,:focus-visible):not(:disabled) > .inspira-shimmer.is-hover > .shimmer-sheen { opacity: var(--shimmer-alpha); animation-play-state: running; }
@keyframes shimmer-sweep { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }
@media(prefers-reduced-motion:reduce) {
 /* Reduced motion: nothing ever spins. "always" keeps the frozen metal rim it has today, hover mode
    stays hidden entirely — a frozen sheen is only a static highlight, never a meaningful cue there. */
 .shimmer-sheen { animation: none; transition: none; }
 .inspira-shimmer.is-hover { --shimmer-alpha: 0; }
}
</style>
