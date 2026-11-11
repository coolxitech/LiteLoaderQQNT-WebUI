<script setup lang="ts">
// 徽标：状态与标签用的胶囊，支持语义色调、柔和/描边两种形态与前置圆点
import { computed } from "vue";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const props = withDefaults(defineProps<{
    tone?: "neutral" | "ok" | "warn" | "danger" | "info" | "accent";
    variant?: "soft" | "outline";
    size?: "sm" | "md";
    dot?: boolean;
}>(), {
    tone: "neutral",
    variant: "soft",
    size: "sm",
    dot: false,
});

const badge_variants = cva("ui-badge", {
    variants: {
        tone: {
            neutral: "ui-badge--neutral",
            ok: "ui-badge--ok",
            warn: "ui-badge--warn",
            danger: "ui-badge--danger",
            info: "ui-badge--info",
            accent: "ui-badge--accent",
        },
        variant: {
            soft: "ui-badge--soft",
            outline: "ui-badge--outline",
        },
        size: {
            sm: "ui-badge--sm",
            md: "ui-badge--md",
        },
    },
    defaultVariants: {
        tone: "neutral",
        variant: "soft",
        size: "sm",
    },
});

const classes = computed(() => cn(
    badge_variants({ tone: props.tone, variant: props.variant, size: props.size }),
));
</script>

<template>
    <span :class="classes">
        <span v-if="dot" class="ui-badge-dot" aria-hidden="true"></span>
        <slot />
    </span>
</template>

<style scoped>
.ui-badge { display:inline-flex; align-items:center; gap:4px; border:1px solid transparent; border-radius:4px; font-size:12px; line-height:1.5; padding:1px 6px; color:var(--fg-muted); background:var(--surface-2); }
.ui-badge--outline { background:transparent; border-color:var(--line); }
.ui-badge--ok,.ui-badge--accent,.ui-badge--info { color:var(--accent-text); background:var(--accent-soft); }
.ui-badge--warn { color:var(--warn); background:var(--warn-soft); }
.ui-badge--danger { color:var(--danger); background:var(--danger-soft); }
.ui-badge-dot { width:4px; height:4px; background:currentColor; border-radius:50%; }
</style>
