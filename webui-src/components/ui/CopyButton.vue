<script setup lang="ts">
// 复制按钮：成功显示对勾、失败显示叉号，1.2 秒后回到初始图标。
import { computed, onBeforeUnmount, ref } from "vue";
import { Check, Copy, X } from "lucide-vue-next";
import { copyToClipboard } from "../../lib/utils";
import Tooltip from "./Tooltip.vue";

type CopyState = "idle" | "copied" | "failed";

/** 图标复原的等待时长，单位毫秒 */
const RESET_DELAY = 1200;

const props = withDefaults(defineProps<{
    value: string;
    label?: string;
}>(), {
    label: "复制"
});

const state = ref<CopyState>("idle");
let reset_timer: ReturnType<typeof setTimeout> | null = null;

function clearResetTimer(): void {
    if (reset_timer === null) return;
    clearTimeout(reset_timer);
    reset_timer = null;
}

async function handleClick(): Promise<void> {
    const copied = await copyToClipboard(props.value);
    state.value = copied ? "copied" : "failed";
    clearResetTimer();
    reset_timer = setTimeout(() => {
        state.value = "idle";
        reset_timer = null;
    }, RESET_DELAY);
}

onBeforeUnmount(() => {
    clearResetTimer();
});

const icon = computed(() => {
    if (state.value === "copied") return Check;
    if (state.value === "failed") return X;
    return Copy;
});

// 提示文案跟着状态走：成功后短暂显示「已复制」
const tooltip_text = computed(() => (state.value === "copied" ? "已复制" : props.label));
</script>

<template>
    <Tooltip :text="tooltip_text">
        <button
            type="button"
            class="ui-copy"
            :class="{ 'is-copied': state === 'copied', 'is-failed': state === 'failed' }"
            :aria-label="label"
            @click="handleClick"
        >
            <component :is="icon" :size="14" aria-hidden="true" />
        </button>
    </Tooltip>
</template>

<style scoped>
.ui-copy {
    display: inline-grid;
    place-items: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--r-xs);
    background: transparent;
    color: var(--fg-subtle);
    cursor: pointer;
    transition: background var(--dur-1) var(--ease-out), border-color var(--dur-1) var(--ease-out), color var(--dur-1) var(--ease-out);
}

.ui-copy:hover {
    border-color: var(--line);
    background: var(--surface-2);
    color: var(--fg);
}

.ui-copy:active {
    background: var(--surface-3);
}

.ui-copy:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
}

.ui-copy.is-copied {
    color: var(--accent-text);
}

.ui-copy.is-failed {
    color: var(--danger);
}
</style>
