<script setup lang="ts">
/* Adapted from Inspira UI AuroraBackground.vue (MIT).
   Source: https://github.com/unovue/inspira-ui/blob/main/app/components/inspira/ui/aurora-background/AuroraBackground.vue
   Upstream recipe kept as-is: one element stacking `--white-gradient` / `--dark-gradient` over `--aurora`
   (a repeating-linear-gradient at 100deg), background-size 300%/200%, blur(10px), plus the
   `radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%)` edge mask.
   Changed for this project:
   - upstream keyframes animate `background-position`; house rules forbid that, so the same bands are
     drifted with `translate3d` only (no background-position, no filter, no size in keyframes);
   - sheet opacity moved into `--aurora-sheet-alpha(-near)` tokens so light can sit one step above dark
     (.70/.64 vs .62/.56): on a near-white hero the dark pair reads as flat haze, while dark already
     separates the three vertical bands at the original strength;
   - two sheets at different tile sizes reproduce the upstream "多段带状" layering. */
withDefaults(defineProps<{ animated?: boolean }>(), { animated: true });
</script>
<template>
 <div class="inspira-aurora" :class="{ 'is-animated': animated }" aria-hidden="true">
  <span class="aurora-sheet"></span>
  <span class="aurora-sheet aurora-sheet--near"></span>
 </div>
</template>
<style scoped>
.inspira-aurora {
 /* Upstream `--aurora` / `--white-gradient` / `--dark-gradient` with project tokens substituted. */
 --aurora-grad: repeating-linear-gradient(100deg,var(--aurora-blue) 10%,var(--aurora-indigo) 15%,var(--aurora-cyan) 20%,var(--aurora-violet) 25%,var(--aurora-blue) 30%);
 --aurora-veil-grad: repeating-linear-gradient(100deg,var(--aurora-veil) 0%,var(--aurora-veil) 7%,transparent 10%,transparent 12%,var(--aurora-veil) 16%);
 /* Deliberately no `contain: paint` / `isolation` here: a stacking context at this level would trap the
    sheets' mix-blend-mode against a transparent group backdrop and turn it into a no-op. overflow:hidden
    plus border-radius already clips the sheets to the hero. */
 position: absolute; inset: 0; overflow: hidden; pointer-events: none; border-radius: inherit;
 /* Upstream radial mask: the aurora blooms from the top-right corner and fades out to the left. */
 -webkit-mask-image: radial-gradient(ellipse 132% 150% at 100% 0%,#000 8%,transparent 72%);
 mask-image: radial-gradient(ellipse 132% 150% at 100% 0%,#000 8%,transparent 72%);
}
/* Band sheet: opaque coloured stripes with the veil gradient stacked on top, exactly like upstream.
   The veil's transparent 10%-12% window is what carves each band out of the colour field. */
.aurora-sheet {
 position: absolute; inset: -26% -18%;
 background-image: var(--aurora-veil-grad), var(--aurora-grad);
 background-size: 180% 150%, 180% 150%;
 background-position: 50% 50%, 50% 50%;
 filter: blur(15px);
 mix-blend-mode: var(--aurora-blend);
 opacity: var(--aurora-sheet-alpha,.62);
 transform: rotate(-7deg) translate3d(0,0,0);
 will-change: transform;
}
/* Second, tighter tile: more bands across the hero, offset angle so the two sheets never line up. */
.aurora-sheet--near { background-size: 112% 96%, 112% 96%; opacity: var(--aurora-sheet-alpha-near,.56); transform: rotate(-13deg) translate3d(0,0,0); }
/* Only the pre-rotated angle plus a small translate changes, so the blurred sheet stays a cached texture. */
.is-animated .aurora-sheet { animation: aurora-drift 34s cubic-bezier(.37,0,.63,1) infinite alternate; }
.is-animated .aurora-sheet--near { animation-name: aurora-drift-near; animation-delay: -11s; }
@keyframes aurora-drift { from { transform: rotate(-7deg) translate3d(-3%,1.6%,0); } to { transform: rotate(-7deg) translate3d(3%,-1.6%,0); } }
@keyframes aurora-drift-near { from { transform: rotate(-13deg) translate3d(2.6%,-2%,0); } to { transform: rotate(-13deg) translate3d(-2.6%,2%,0); } }
@media(prefers-reduced-motion:reduce) { .is-animated .aurora-sheet { animation: none; } }
</style>
