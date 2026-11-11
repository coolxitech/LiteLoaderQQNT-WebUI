<script setup lang="ts">
// 多行文本输入：等宽模式与滚动事件透传，供外部行号栏做同步滚动
import { computed, ref } from "vue";
import { cn } from "../../lib/utils";

const props = withDefaults(defineProps<{
    modelValue: string;
    rows?: number;
    mono?: boolean;
    invalid?: boolean;
    ariaLabel?: string;
    spellcheck?: boolean;
}>(), {
    rows: 6,
    mono: false,
    invalid: false,
    ariaLabel: undefined,
    spellcheck: false,
});

const emit = defineEmits<{
    "update:modelValue": [value: string];
    scroll: [event: Event];
}>();
const composing = ref(false);

function on_composition_start(): void {
    composing.value = true;
}

function on_composition_end(event: CompositionEvent): void {
    composing.value = false;
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | null;
    if (target) emit("update:modelValue", target.value);
}

const classes = computed(() => cn(
    "ui-textarea",
    props.mono && "ui-textarea--mono",
    props.invalid && "ui-textarea--invalid",
));

function on_input(event: Event): void {
    if (composing.value) return;
    const target = event.target as HTMLTextAreaElement | null;
    if (!target) return;
    emit("update:modelValue", target.value);
}

function on_scroll(event: Event): void {
    emit("scroll", event);
}
</script>

<template>
    <textarea
        :class="classes"
        :value="modelValue"
        :rows="rows"
        :spellcheck="spellcheck"
        :aria-label="ariaLabel"
        :aria-invalid="invalid ? 'true' : undefined"
        @input="on_input"
        @compositionstart="on_composition_start"
        @compositionend="on_composition_end"
        @scroll="on_scroll"
    ></textarea>
</template>

<style scoped>
.ui-textarea {
    width: 100%;
    min-height: 120px;
    padding: var(--sp-5) var(--sp-6);
    background: var(--surface-2);
    border: 1px solid var(--control-line);
    border-radius: var(--r-sm);
    color: var(--fg);
    font-family: inherit;
    font-size: var(--text-sm);
    line-height: 1.7;
    resize: vertical;
    transition:
        background-color var(--dur-2) var(--ease-out),
        border-color var(--dur-2) var(--ease-out),
        box-shadow var(--dur-2) var(--ease-out);
}

.ui-textarea:hover {
    border-color: var(--line-strong);
}

.ui-textarea:focus {
    border-color: var(--ring);
    box-shadow: 0 0 0 3px var(--accent-soft);
    outline: none;
}

.ui-textarea--invalid {
    border-color: var(--danger);
}

.ui-textarea--invalid:focus {
    border-color: var(--danger);
    box-shadow: 0 0 0 3px var(--danger-soft);
}

.ui-textarea::placeholder {
    color: var(--fg-subtle);
}

/* 等宽模式：代码类内容用 12.5px，比正文字号略小以容纳更多字符 */
.ui-textarea--mono {
    font-family: var(--font-mono);
    font-size: var(--text-code);
}

.ui-textarea:disabled {
    opacity: .55;
    cursor: not-allowed;
}
</style>
