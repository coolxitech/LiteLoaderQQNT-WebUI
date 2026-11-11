<script setup lang="ts">
/* Adapted from Inspira UI CardSpotlight.vue (MIT); same interaction as Magic UI's MagicCard.tsx.
   Sources:
   - https://github.com/unovue/inspira-ui/blob/main/app/components/inspira/ui/card-spotlight/CardSpotlight.vue
   - https://github.com/magicuidesign/magicui/blob/main/apps/www/registry/magicui/magic-card.tsx
   Note: unovue/inspira-ui does not ship a `MagicCard.vue` (verified against the repo tree); its Vue port of
   this pattern is CardSpotlight.vue, which is the file adapted here. MagicCard.tsx supplies the two-gradient
   structure that CardSpotlight flattens into one:
     border-box:  radial-gradient(<gradientSize>px circle at <x>px <y>px, gradientFrom, gradientTo, border 100%)
     inner glow : radial-gradient(<gradientSize>px circle at <x>px <y>px, gradientColor, transparent 100%) @ gradientOpacity
   Upstream defaults: gradientSize 200, gradientColor #262626, gradientOpacity .8, gradientFrom #9E7AFF.
   Changed for this project:
   - gradientSize 280 (design brief asks for a 240-320px radius) and the glow colour/alpha come from theme
     tokens instead of a hardcoded near-black, so it works on light and dark surfaces;
   - the cursor is tracked with an element-level `pointermove` (no window/document listener), and the
     position is written through one requestAnimationFrame per frame;
   - tracking is disabled for `pointer: coarse` and `prefers-reduced-motion: reduce`. */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const props = withDefaults(defineProps<{ tag?: string; gradientSize?: number }>(), {
    tag: "div",
    gradientSize: 280,
});

const active = ref(false);
const cursor_x = ref(-999);
const cursor_y = ref(-999);

let frame = 0;
let pending_x = 0;
let pending_y = 0;
let follow = false;
let motion_query: MediaQueryList | null = null;
let pointer_query: MediaQueryList | null = null;

function sync_capability(): void {
    const reduced = motion_query !== null && motion_query.matches;
    const coarse = pointer_query !== null && pointer_query.matches;
    follow = !reduced && !coarse;
    if (!follow) {
        active.value = false;
        if (frame !== 0) { cancelAnimationFrame(frame); frame = 0; }
    }
}

function on_pointer_move(event: PointerEvent): void {
    if (!follow) return;
    const host = event.currentTarget as HTMLElement | null;
    if (host === null) return;
    const rect = host.getBoundingClientRect();
    pending_x = event.clientX - rect.left;
    pending_y = event.clientY - rect.top;
    active.value = true;
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
        frame = 0;
        cursor_x.value = pending_x;
        cursor_y.value = pending_y;
    });
}

function on_pointer_leave(): void {
    if (frame !== 0) { cancelAnimationFrame(frame); frame = 0; }
    active.value = false;
}

onMounted(() => {
    if (typeof window.matchMedia !== "function") { follow = true; return; }
    motion_query = window.matchMedia("(prefers-reduced-motion: reduce)");
    pointer_query = window.matchMedia("(pointer: coarse)");
    sync_capability();
    motion_query.addEventListener("change", sync_capability);
    pointer_query.addEventListener("change", sync_capability);
});

onBeforeUnmount(() => {
    if (frame !== 0) { cancelAnimationFrame(frame); frame = 0; }
    motion_query?.removeEventListener("change", sync_capability);
    pointer_query?.removeEventListener("change", sync_capability);
});

const root_style = computed(() => ({
    "--inspira-mx": cursor_x.value + "px",
    "--inspira-my": cursor_y.value + "px",
    "--inspira-size": props.gradientSize + "px",
}));
</script>
<template>
 <component
  :is="tag"
  class="inspira-magic-card"
  :class="{ 'is-tracking': active }"
  :style="root_style"
  @pointerenter="on_pointer_move"
  @pointermove="on_pointer_move"
  @pointerleave="on_pointer_leave"
 >
  <span class="magic-glow" aria-hidden="true"></span>
  <span class="magic-edge" aria-hidden="true"></span>
  <slot />
 </component>
</template>
<style scoped>
/* isolate() keeps the negative z-index layers above the host's own background (Vue drops ::before/::after
   ordering otherwise) without touching the host's other declarations. */
.inspira-magic-card { position: relative; isolation: isolate; }
/* Cursor-following fill: upstream `radial-gradient(<size>px circle at x y, gradientColor, transparent 100%)`. */
.magic-glow {
 position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit;
 background: radial-gradient(circle var(--inspira-size,280px) at var(--inspira-mx,-999px) var(--inspira-my,-999px),var(--magic-glow),transparent 100%);
 mix-blend-mode: var(--magic-blend);
 opacity: 0;
 transition: opacity 240ms var(--motion-ease);
}
/* Cursor-following 1px edge: same radial, masked down to the 1px ring inside the host border. */
.magic-edge {
 position: absolute; inset: 0; z-index: -1; padding: 1px; pointer-events: none; border-radius: inherit;
 -webkit-mask: linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
 -webkit-mask-composite: xor;
 mask: linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
 mask-composite: exclude;
 background: radial-gradient(circle var(--inspira-size,280px) at var(--inspira-mx,-999px) var(--inspira-my,-999px),var(--aurora-indigo),var(--accent-line) 46%,transparent 100%);
 opacity: 0;
 transition: opacity 240ms var(--motion-ease);
}
.is-tracking .magic-glow { opacity: 1; }
.is-tracking .magic-edge { opacity: .9; }
@media(prefers-reduced-motion:reduce) { .magic-glow,.magic-edge { transition: none; } }
</style>
