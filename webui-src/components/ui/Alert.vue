<script setup lang="ts">
// 行内提示条：tone 决定底色与文字色，ok 复用强调色而不是单独的颜色令牌
import { computed } from "vue";
import type { Component } from "vue";
import { cva } from "class-variance-authority";
import { CircleCheckBig, CircleX, Info, TriangleAlert } from "lucide-vue-next";

type AlertTone = "info" | "ok" | "warn" | "danger";

const props = withDefaults(defineProps<{
    tone?: AlertTone;
    title?: string;
}>(), {
    tone: "info"
});

// tone 到类名的映射交给 cva，具体颜色仍写在 scoped CSS 里
const alert_class = cva("ui-alert", {
    variants: {
        tone: {
            info: "is-info",
            ok: "is-ok",
            warn: "is-warn",
            danger: "is-danger"
        }
    },
    defaultVariants: {
        tone: "info"
    }
});

const tone_icons: Record<AlertTone, Component> = {
    info: Info,
    ok: CircleCheckBig,
    warn: TriangleAlert,
    danger: CircleX
};

const icon = computed(() => tone_icons[props.tone]);
</script>

<template>
    <div :class="alert_class({ tone })">
        <component :is="icon" class="ui-alert-icon" :size="16" aria-hidden="true" />
        <div class="ui-alert-body">
            <p v-if="title" class="ui-alert-title">{{ title }}</p>
            <div class="ui-alert-text" :class="{ 'has-title': title }">
                <slot />
            </div>
        </div>
        <div v-if="$slots.actions" class="ui-alert-actions">
            <slot name="actions" />
        </div>
    </div>
</template>

<style scoped>
.ui-alert {
    display: flex;
    gap: var(--sp-5);
    padding: var(--sp-6) var(--sp-7);
    border: 1px solid transparent;
    border-radius: var(--r-sm);
}

.ui-alert.is-info {
    background: var(--info-soft);
    color: var(--info);
}

.ui-alert.is-ok {
    background: var(--accent-soft);
    color: var(--accent-text);
}

.ui-alert.is-warn {
    background: var(--warn-soft);
    color: var(--warn);
}

.ui-alert.is-danger {
    background: var(--danger-soft);
    color: var(--danger);
}

/* 图标顶对齐：和第一行文字基线视觉对齐 */
.ui-alert-icon {
    flex-shrink: 0;
    margin-top: 1px;
}

.ui-alert-body {
    flex: 1;
    min-width: 0;
    font-size: var(--text-sm);
    line-height: var(--leading-snug);
    overflow-wrap: anywhere;
}

.ui-alert-title {
    font-weight: 600;
}

.ui-alert-text.has-title {
    margin-top: var(--sp-1);
}

.ui-alert-actions {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--sp-3);
}
</style>
