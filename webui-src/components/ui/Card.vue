<script setup lang="ts">
// 卡片：控制台里的基础容器，可选内边距、语义色调与悬停可交互态
import { computed } from "vue";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const props = withDefaults(defineProps<{
    padding?: "none" | "sm" | "md";
    interactive?: boolean;
    tone?: "default" | "accent" | "warn" | "danger";
}>(), {
    padding: "md",
    interactive: false,
    tone: "default",
});

const card_variants = cva("ui-card", {
    variants: {
        padding: {
            none: "ui-card--padding-none",
            sm: "ui-card--padding-sm",
            md: "ui-card--padding-md",
        },
        tone: {
            default: "ui-card--tone-default",
            accent: "ui-card--tone-accent",
            warn: "ui-card--tone-warn",
            danger: "ui-card--tone-danger",
        },
    },
    defaultVariants: {
        padding: "md",
        tone: "default",
    },
});

const classes = computed(() => cn(
    card_variants({ padding: props.padding, tone: props.tone }),
    props.interactive && "ui-card--interactive",
));
</script>

<template>
    <div :class="classes">
        <slot />
    </div>
</template>

<style scoped>
.ui-card { background:var(--surface-1); border:1px solid var(--line); border-radius:6px; min-width:0; }
.ui-card--padding-none { padding:0; } .ui-card--padding-sm { padding:16px; } .ui-card--padding-md { padding:20px; }
.ui-card--tone-accent { border-color:var(--accent-line); } .ui-card--tone-warn { border-color:var(--warn); } .ui-card--tone-danger { border-color:var(--danger); }
.ui-card--interactive { cursor:pointer; } .ui-card--interactive:hover { background:var(--surface-2); }

.ui-card { border-radius:8px; box-shadow:var(--elev-1); background:linear-gradient(145deg,var(--surface-1),var(--surface-2)); }

</style>
