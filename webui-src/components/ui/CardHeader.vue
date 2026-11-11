<script setup lang="ts">
// 卡片头：左侧标题与说明，右侧操作区，标题下方可再插入自定义内容
defineProps<{
    title: string;
    description?: string;
}>();
</script>

<template>
    <div class="ui-card-header">
        <div class="ui-card-header-main">
            <h2 class="ui-card-header-title">{{ title }}</h2>
            <p v-if="description" class="ui-card-header-desc">{{ description }}</p>
            <slot />
        </div>
        <div v-if="$slots.actions" class="ui-card-header-actions">
            <slot name="actions" />
        </div>
    </div>
</template>

<style scoped>
.ui-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--sp-6);
    margin-bottom: var(--sp-7);
}

.ui-card-header-main {
    min-width: 0;
}

.ui-card-header-title {
    margin: 0;
    color: var(--fg);
    font-size: var(--text-md);
    font-weight: 600;
    letter-spacing: -.01em;
}

.ui-card-header-desc {
    margin-top: var(--sp-2);
    max-width: 68ch;
    color: var(--fg-muted);
    font-size: var(--text-sm);
    line-height: var(--leading-snug);
}

.ui-card-header-actions {
    display: flex;
    flex-shrink: 0;
    gap: var(--sp-3);
}
</style>
