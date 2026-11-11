<script setup lang="ts">
// 分段控件：单选的横向切换器，用 reka-ui ToggleGroup 保证键盘可达
import { ToggleGroupItem, ToggleGroupRoot } from "reka-ui";
import type { AcceptableValue } from "reka-ui";

withDefaults(defineProps<{
    modelValue: string;
    options: { value: string; label: string }[];
    ariaLabel?: string;
}>(), {
    ariaLabel: undefined,
});

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

// single 模式下 reka 仍可能回调数组或 undefined（再次点击取消选中），这里只放行字符串
function on_change(value: AcceptableValue | AcceptableValue[]): void {
    if (typeof value === "string") emit("update:modelValue", value);
}
</script>

<template>
    <ToggleGroupRoot
        type="single"
        class="ui-segmented"
        :model-value="modelValue"
        :aria-label="ariaLabel"
        @update:model-value="on_change"
    >
        <ToggleGroupItem
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            class="ui-segmented-item"
        >
            {{ option.label }}
        </ToggleGroupItem>
    </ToggleGroupRoot>
</template>

<style scoped>
.ui-segmented {
    display: inline-flex;
    flex-wrap: wrap;
    gap: var(--sp-1);
    /* 3px 内衬不在间距刻度上，保持与原设计稿一致的细边距 */
    padding: 3px;
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: var(--r-sm);
}

.ui-segmented-item {
    height: 26px;
    padding: 0 var(--sp-5);
    border: 0;
    border-radius: var(--r-xs);
    background: transparent;
    color: var(--fg-muted);
    font-family: inherit;
    font-size: var(--text-xs);
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition:
        background-color var(--dur-2) var(--ease-out),
        color var(--dur-2) var(--ease-out),
        box-shadow var(--dur-2) var(--ease-out);
}

.ui-segmented-item:hover {
    color: var(--fg);
}

.ui-segmented-item:active {
    background: var(--surface-3);
}

.ui-segmented-item:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 1px;
}

.ui-segmented-item[data-state="on"] {
    background: var(--surface-1);
    color: var(--fg);
    box-shadow: inset 0 -2px 0 var(--accent);
}

.ui-segmented-item[data-disabled] {
    opacity: .5;
    cursor: not-allowed;
}

.ui-segmented { padding:4px; border-radius:7px; background:var(--surface-3); }
.ui-segmented-item { border-radius:4px; height:28px; }
.ui-segmented-item[data-state="on"] { color:var(--accent-text); box-shadow:inset 0 0 0 1px var(--line),0 2px 5px rgba(35,53,86,.08); }

</style>
