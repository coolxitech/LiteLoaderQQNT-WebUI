<script setup lang="ts">
// 骨架屏：加载占位块，支持多行与自定义宽高圆角，纯装饰不参与可读内容
import { computed } from "vue";
import type { CSSProperties } from "vue";
import { cn } from "../../lib/utils";

const props = withDefaults(defineProps<{
    width?: string;
    height?: string;
    radius?: string;
    lines?: number;
}>(), {
    width: "100%",
    height: "14px",
    radius: "var(--r-xs)",
    lines: 1,
});

const line_count = computed(() => Math.max(1, Math.floor(props.lines)));

const root_class = computed(() => cn("ui-skeleton", line_count.value > 1 && "ui-skeleton--stack"));

// 多行时最后一行收窄到 45%，视觉上更像段落
function line_style(index: number): CSSProperties {
    const is_last = index === line_count.value;
    return {
        width: is_last && line_count.value > 1 ? "45%" : props.width,
        height: props.height,
        borderRadius: props.radius,
    };
}
</script>

<template>
    <div :class="root_class" aria-hidden="true">
        <span v-for="index in line_count" :key="index" class="ui-skeleton-block" :style="line_style(index)"></span>
    </div>
</template>

<style scoped>
.ui-skeleton { display:block; width:100%; }
.ui-skeleton--stack { display:flex; flex-direction:column; gap:12px; }
.ui-skeleton-block { display:block; background:var(--surface-3); }
</style>
