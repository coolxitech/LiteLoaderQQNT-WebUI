<script setup lang="ts">
// 开关：布尔状态切换，支持禁用与加载中，键盘可用（reka 自带 aria-checked）
import { computed } from "vue";
import { SwitchRoot, SwitchThumb } from "reka-ui";
import { cn } from "../../lib/utils";

const props = withDefaults(defineProps<{
    modelValue: boolean;
    disabled?: boolean;
    loading?: boolean;
    ariaLabel?: string;
}>(), {
    disabled: false,
    loading: false,
    ariaLabel: undefined,
});

const emit = defineEmits<{ "update:modelValue": [value: boolean] }>();

const root_class = computed(() => cn("ui-switch", props.loading && "ui-switch--loading"));

function on_change(value: boolean): void {
    emit("update:modelValue", value);
}
</script>

<template>
    <SwitchRoot
        :class="root_class"
        :model-value="modelValue"
        :disabled="disabled || loading"
        :aria-label="ariaLabel"
        @update:model-value="on_change"
    >
        <SwitchThumb class="ui-switch-thumb">
            <span v-if="loading" class="ui-switch-spinner" aria-hidden="true"></span>
        </SwitchThumb>
    </SwitchRoot>
</template>

<style scoped>
.ui-switch {
    position: relative;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    width: 38px;
    height: 22px;
    padding: var(--sp-1);
    background: var(--surface-3);
    border: 1px solid var(--control-line);
    border-radius: var(--r-full);
    cursor: pointer;
    transition:
        background-color var(--dur-2) var(--ease-out),
        border-color var(--dur-2) var(--ease-out),
        opacity var(--dur-2) var(--ease-out);
}

.ui-switch:hover:not([data-disabled]) {
    border-color: var(--control-line);
}

.ui-switch[data-state="checked"] {
    background: var(--accent-solid);
    border-color: transparent;
}

.ui-switch:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
}

.ui-switch[data-disabled] {
    opacity: .5;
    cursor: not-allowed;
}

.ui-switch--loading {
    opacity: .7;
    pointer-events: none;
}

.ui-switch-thumb {
    display: grid;
    place-items: center;
    width: 16px;
    height: 16px;
    border-radius: var(--r-full);
    background: var(--fg-muted);
    transition:
        transform var(--dur-2) var(--ease-spring),
        background-color var(--dur-2) var(--ease-out);
}

.ui-switch[data-state="checked"] .ui-switch-thumb {
    background: var(--accent-ink);
    transform: translateX(16px);
}

.ui-switch-spinner {
    width: 8px;
    height: 8px;
    border: 1.5px solid var(--accent-solid);
    border-top-color: transparent;
    border-radius: var(--r-full);
    animation: ui-switch-spin .7s linear infinite;
}

@keyframes ui-switch-spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
