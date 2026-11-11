<script setup lang="ts">
// 空状态占位：图标 + 标题 + 可选说明 + 可选操作区
import type { Component } from "vue";
import { Inbox } from "lucide-vue-next";

withDefaults(defineProps<{
    title: string;
    description?: string;
    icon?: Component;
}>(), {
    // 组件类型的默认值必须用工厂函数，避免多次渲染共用同一个实例状态
    icon: () => Inbox
});
</script>

<template>
    <div class="ui-empty">
        <div class="ui-empty-icon">
            <component :is="icon" :size="20" aria-hidden="true" />
        </div>
        <p class="ui-empty-title">{{ title }}</p>
        <p v-if="description" class="ui-empty-desc">{{ description }}</p>
        <div v-if="$slots.actions" class="ui-empty-actions">
            <slot name="actions" />
        </div>
    </div>
</template>

<style scoped>
.ui-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-5);
    padding: var(--sp-14) var(--sp-9);
    text-align: center;
}

.ui-empty-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid var(--line);
    border-radius: var(--r-md);
    background: var(--surface-2);
    color: var(--fg-subtle);
}

.ui-empty-title {
    color: var(--fg);
    font-size: var(--text-md);
    font-weight: 600;
}

.ui-empty-desc {
    max-width: 46ch;
    margin-inline: auto;
    color: var(--fg-muted);
    font-size: var(--text-sm);
    line-height: var(--leading-snug);
    overflow-wrap: anywhere;
}

.ui-empty-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--sp-4);
    margin-top: var(--sp-2);
}
</style>
