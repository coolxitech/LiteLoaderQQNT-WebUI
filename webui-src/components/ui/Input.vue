<script setup lang="ts">
// 单行输入框：外层包装承担边框与焦点环，前后可挂图标或按钮插槽
import { computed, ref } from "vue";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const props = withDefaults(defineProps<{
    modelValue: string;
    type?: string;
    placeholder?: string;
    size?: "sm" | "md";
    invalid?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
}>(), {
    type: "text",
    placeholder: undefined,
    size: "md",
    invalid: false,
    disabled: false,
    ariaLabel: undefined,
});

const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const composing = ref(false);

function on_composition_start(): void {
    composing.value = true;
}

function on_composition_end(event: CompositionEvent): void {
    composing.value = false;
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    if (target) emit("update:modelValue", target.value);
}

const input_variants = cva("ui-input", {
    variants: {
        size: {
            sm: "ui-input--sm",
            md: "ui-input--md",
        },
    },
    defaultVariants: {
        size: "md",
    },
});

const wrapper_class = computed(() => cn(
    input_variants({ size: props.size }),
    props.invalid && "ui-input--invalid",
    props.disabled && "ui-input--disabled",
));

function on_input(event: Event): void {
    if (composing.value) return;
    const target = event.target as HTMLInputElement | null;
    if (!target) return;
    emit("update:modelValue", target.value);
}
</script>

<template>
    <div :class="wrapper_class">
        <span v-if="$slots.prefix" class="ui-input-affix ui-input-affix--prefix">
            <slot name="prefix" />
        </span>
        <input
            class="ui-input-field"
            :type="type"
            :value="modelValue"
            :placeholder="placeholder"
            :disabled="disabled"
            :aria-label="ariaLabel"
            :aria-invalid="invalid ? 'true' : undefined"
            @input="on_input"
            @compositionstart="on_composition_start"
            @compositionend="on_composition_end"
        >
        <span v-if="$slots.suffix" class="ui-input-affix ui-input-affix--suffix">
            <slot name="suffix" />
        </span>
    </div>
</template>

<style scoped>
/* 外层：边框、背景与焦点环都在这里，内层 input 完全透明 */
.ui-input {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    height: 36px;
    padding: 0 var(--sp-5);
    background: var(--surface-1);
    border: 1px solid var(--control-line);
    border-radius: var(--r-sm);
    transition:
        background-color var(--dur-2) var(--ease-out),
        border-color var(--dur-2) var(--ease-out),
        box-shadow var(--dur-2) var(--ease-out);
}

.ui-input--sm {
    height: 28px;
}

.ui-input:hover {
    border-color: var(--control-line);
}

.ui-input:focus-within {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px var(--accent-soft);
}

.ui-input--invalid {
    border-color: var(--danger);
}

.ui-input--invalid:focus-within {
    border-color: var(--danger);
    box-shadow: 0 0 0 3px var(--danger-soft);
}

.ui-input--disabled {
    opacity: .55;
    cursor: not-allowed;
}

.ui-input--disabled:hover {
    border-color: var(--line);
}

/* 内层输入：去掉自身边框与 outline，焦点表现交给外层 */
.ui-input-field {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--fg);
    font-family: inherit;
    font-size: var(--text-sm);
}

.ui-input-field:focus,
.ui-input-field:focus-visible {
    outline: none;
}

.ui-input-field::placeholder {
    color: var(--fg-subtle);
}

.ui-input-field:disabled {
    cursor: not-allowed;
}

/* 前后缀插槽：不拦截事件，suffix 里的按钮可以正常点击 */
.ui-input-affix {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    color: var(--fg-subtle);
}

.ui-input { border-radius:6px; box-shadow:inset 0 1px 3px rgba(40,55,86,.035); }
.ui-input:focus-within { outline:2px solid var(--ring); outline-offset:1px; box-shadow:0 0 0 4px var(--accent-soft); }

</style>
