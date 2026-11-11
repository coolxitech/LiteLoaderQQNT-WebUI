<script setup lang="ts">
// 复选框：单个布尔勾选，文字标签整体可点，选中态用主色实心块
import { CheckboxIndicator, CheckboxRoot } from "reka-ui";
import { Check } from "lucide-vue-next";

withDefaults(defineProps<{
    modelValue: boolean;
    disabled?: boolean;
}>(), {
    disabled: false,
});

const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

// reka 的回调值可能是 "indeterminate"，本组件只关心 true / false
function on_change(value: boolean | "indeterminate"): void {
    emit("update:modelValue", value === true);
}
</script>

<template>
    <label class="ui-checkbox" :class="{ 'ui-checkbox--disabled': disabled }">
        <CheckboxRoot
            class="ui-checkbox-box"
            :model-value="modelValue"
            :disabled="disabled"
            @update:model-value="on_change"
        >
            <CheckboxIndicator class="ui-checkbox-indicator">
                <Check :size="12" :stroke-width="3" aria-hidden="true" />
            </CheckboxIndicator>
        </CheckboxRoot>
        <span v-if="$slots.default" class="ui-checkbox-text">
            <slot />
        </span>
    </label>
</template>

<style scoped>
.ui-checkbox {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-4);
    padding: var(--sp-3) 0;
    color: var(--fg-muted);
    font-size: var(--text-sm);
    line-height: var(--leading-snug);
    cursor: pointer;
    transition: color var(--dur-2) var(--ease-out);
}

.ui-checkbox:hover {
    color: var(--fg);
}

.ui-checkbox--disabled {
    opacity: .5;
    cursor: not-allowed;
}

.ui-checkbox-box {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    background: var(--surface-2);
    border: 1px solid var(--control-line);
    border-radius: var(--r-xs);
    cursor: pointer;
    transition:
        background-color var(--dur-2) var(--ease-out),
        border-color var(--dur-2) var(--ease-out),
        box-shadow var(--dur-2) var(--ease-out);
}

.ui-checkbox-box:hover:not([data-disabled]) {
    border-color: var(--accent);
}

.ui-checkbox-box[data-state="checked"] {
    background: var(--accent-solid);
    border-color: transparent;
}

.ui-checkbox-box:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
}

.ui-checkbox-box[data-disabled] {
    cursor: not-allowed;
}

.ui-checkbox-indicator {
    display: grid;
    place-items: center;
    color: var(--accent-ink);
}

.ui-checkbox-text {
    min-width: 0;
}
</style>
