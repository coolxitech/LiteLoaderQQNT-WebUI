<script setup lang="ts">
/* Adapted from Inspira UI NumberTicker.vue (MIT).
   Source: https://github.com/unovue/inspira-ui/blob/main/app/components/inspira/ui/number-ticker/NumberTicker.vue
   Upstream drives `useTransition` (vueuse) with the `easeOutCubic` preset and prints through
   `Intl.NumberFormat` inside a `tabular-nums` span, starting when the span scrolls into view.
   Changed for this project:
   - no new dependency: the same easeOutCubic tween is a 700ms requestAnimationFrame loop;
   - the hero count is already on screen, so the visible-into-view gate is dropped and the tween starts
     on mount from 0 (and from the previous value on later store refreshes);
   - reduced motion sets the final value directly instead of animating. */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = withDefaults(defineProps<{ value: number; duration?: number }>(), { duration: 700 });

const display = ref(0);
let frame = 0;
let from = 0;
let to = 0;
let started = 0;

function prefers_reduced(): boolean {
    return typeof window !== "undefined"
        && typeof window.matchMedia === "function"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Same curve as upstream `TransitionPresets.easeOutCubic`
function ease_out_cubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

function run(next: number): void {
    if (frame !== 0) { cancelAnimationFrame(frame); frame = 0; }
    if (prefers_reduced() || props.duration <= 0) { display.value = next; return; }
    from = display.value;
    to = next;
    if (from === to) return;
    started = 0;
    const step = (now: number): void => {
        if (started === 0) started = now;
        const progress = Math.min(1, (now - started) / props.duration);
        display.value = Math.round(from + (to - from) * ease_out_cubic(progress));
        if (progress < 1) { frame = requestAnimationFrame(step); }
        else { frame = 0; display.value = to; }
    };
    frame = requestAnimationFrame(step);
}

onMounted(() => run(props.value));
watch(() => props.value, (next) => run(next));
onBeforeUnmount(() => { if (frame !== 0) { cancelAnimationFrame(frame); frame = 0; } });

const text = computed(() => new Intl.NumberFormat("zh-CN").format(display.value));
</script>
<template>
 <span class="inspira-ticker">{{ text }}</span>
</template>
<style scoped>
.inspira-ticker { display: inline-block; font-variant-numeric: tabular-nums; }
</style>
