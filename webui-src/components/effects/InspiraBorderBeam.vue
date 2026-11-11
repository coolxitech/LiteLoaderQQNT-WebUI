<script setup lang="ts">
/* Adapted from Inspira UI BorderBeam.vue (MIT).
   Source: https://github.com/unovue/inspira-ui/blob/main/app/components/inspira/ui/border-beam/BorderBeam.vue
   Upstream: a 1.5px masked border whose ::after is a `offset-path: rect(0 auto auto 0 round Npx)` star
   with `linear-gradient(to_left, colorFrom, colorTo, transparent)` travelling for 15s linear infinite.
   Changed for this project:
   - `offset-path: rect()` is out of budget on Chrome 100, so the travelling star becomes a conic band
     rotated with `transform: rotate()` inside the same masked ring (2px here, per the design brief);
   - the upstream `offset-distance` animation becomes `beam-orbit 9s linear infinite`;
   - always running (the previous build only played one 1.4s pass on hover), opacity .85 so it reads. */
</script>
<template>
 <span class="inspira-border-beam" aria-hidden="true"><span class="beam-orbit"></span></span>
</template>
<style scoped>
/* 2px ring: the mask keeps the border box and cuts the content box out of it. */
.inspira-border-beam { position: absolute; inset: 0; padding: 2px; border-radius: inherit; pointer-events: none; overflow: hidden; -webkit-mask: linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0); mask-composite: exclude; }
/* The orbiting band is a square whose side is 150% of the container width (padding-bottom percentages
   resolve against width, so this stays square for any hero aspect). A rotating square always contains
   its inscribed circle of radius side/2, i.e. 0.75 * width, which exceeds the hero's half diagonal,
   so the ring is never left uncovered at any rotation angle. */
.beam-orbit { position: absolute; left: 50%; top: 50%; width: 150%; height: 0; padding-bottom: 150%; transform: translate(-50%,-50%) rotate(0deg); background: conic-gradient(from 0deg,transparent 0 58%,var(--accent-line) 72%,var(--aurora-indigo) 80%,var(--aurora-cyan) 87%,transparent 96%); opacity: .85; will-change: transform; animation: beam-orbit 9s linear infinite; }
@keyframes beam-orbit { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }
@media(prefers-reduced-motion:reduce) { .beam-orbit { animation: none; } }
</style>
