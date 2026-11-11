<script setup lang="ts">
/* animate.css wrapper: one whitelisted, transform/opacity-only animation per mount, never a loop.
   animate.css is imported globally in main.ts, so this component only picks a class and feeds the two
   official custom properties (`--animate-duration` / `--animate-delay`, both in ms, mapped onto
   `animation-duration` / `animation-delay` by refined.css).
   Decisions worth knowing:
   - `name` is validated against ANIMATIONS. Anything outside the whitelist (bounce, shake, pulse, flip,
     hinge, jackInTheBox ...) silently falls back to fadeInUp, so a typo can never bring back a rubber-band
     animation or a layout wobble;
   - reduced motion never gets the animate classes at all. animate.css's own
     `@media (prefers-reduced-motion: reduce)` block only shortens the duration to 1ms, which still leaves a
     staggered item blank for its whole `animation-delay` (fill-mode keeps the `from` keyframe);
     `usePreferredReducedMotion` therefore renders the final state immediately;
   - `once` (default) animates the mount pass only, so a store refresh that swaps the data behind the slot
     cannot replay it. `once=false` lets `play` restart the animation, done by dropping the classes,
     flushing the style and adding them back — no remount, so child state and focus survive.
   - This is a content container, not decoration: no `aria-hidden`, the slot keeps its own semantics. */
import { computed, nextTick, ref, watch } from "vue";
import { usePreferredReducedMotion } from "@vueuse/core";

/** Whitelist: animation name -> animate.css class. Calm fades / slides / zooms only. */
const ANIMATIONS = {
    fadeIn: "animate__fadeIn",
    fadeInUp: "animate__fadeInUp",
    fadeInDown: "animate__fadeInDown",
    fadeInLeft: "animate__fadeInLeft",
    fadeInRight: "animate__fadeInRight",
    zoomIn: "animate__zoomIn",
    slideInUp: "animate__slideInUp",
    slideInRight: "animate__slideInRight",
    fadeOut: "animate__fadeOut",
    fadeOutUp: "animate__fadeOutUp",
    zoomOut: "animate__zoomOut"
} as const;

type AnimationName = keyof typeof ANIMATIONS;

const FALLBACK_ANIMATION: AnimationName = "fadeInUp";
/** Stagger slot cap: 12 * 40ms = 480ms, the longest a list entrance is allowed to wait. */
const STAGGER_MAX_INDEX = 12;
const STAGGER_STEP = 40;

const props = withDefaults(defineProps<{
    /** animate.css animation name, validated against the whitelist. */
    name?: string;
    /** Animation duration in milliseconds. */
    duration?: number;
    /** Extra delay in milliseconds, added on top of the stagger. */
    delay?: number;
    /** Stagger slot for list items: real delay = delay + min(index, 12) * 40. */
    index?: number;
    /** Animate the first appearance only (default); later `play` edges are ignored. */
    once?: boolean;
    /** Explicit replay switch, only honoured when `once` is false. */
    play?: boolean;
    /** Rendered tag. */
    as?: string;
}>(), {
    name: FALLBACK_ANIMATION,
    duration: 240,
    delay: 0,
    index: 0,
    once: true,
    play: true,
    as: "div"
});

// hasOwnProperty, not `in`: "constructor" and friends must not pass the whitelist
function is_whitelisted(value: string): value is AnimationName {
    return Object.prototype.hasOwnProperty.call(ANIMATIONS, value);
}

const reduced_motion = usePreferredReducedMotion();
const el = ref<Element | null>(null);

const animation = computed<AnimationName>(() => (is_whitelisted(props.name) ? props.name : FALLBACK_ANIMATION));

/** Real delay: the explicit delay plus the clamped stagger slot. */
const total_delay = computed(() => (
    Math.max(0, props.delay) + Math.min(Math.max(props.index, 0), STAGGER_MAX_INDEX) * STAGGER_STEP
));

const style = computed(() => ({
    "--animate-duration": `${Math.max(0, props.duration)}ms`,
    "--animate-delay": `${total_delay.value}ms`
}));

// Class switch, not a key switch: replaying must never remount the slotted content.
const playing = ref(props.play);
const classes = computed(() => (
    playing.value && reduced_motion.value !== "reduce"
        ? `animate__animated ${ANIMATIONS[animation.value]}`
        : ""
));

watch(() => props.play, async (next) => {
    // `once`: the mount pass is the only pass, later play edges are ignored on purpose
    if (props.once) return;
    if (!next) {
        playing.value = false;
        return;
    }
    // Restart: drop the classes, flush the style, add them back. Re-adding inside the same class patch
    // would be coalesced by the browser and the animation would keep running instead of restarting.
    playing.value = false;
    await nextTick();
    if (el.value instanceof HTMLElement) void el.value.offsetWidth;
    playing.value = true;
});
</script>

<template>
    <component :is="as" ref="el" class="ease-item" :class="classes" :style="style">
        <slot />
    </component>
</template>
