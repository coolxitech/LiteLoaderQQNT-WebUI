<script setup>
import { status, busy, update_result, version_cards, path_rows, counts, loadStatus, checkUpdate } from "../store.js";
</script>

<template>
    <section class="webui-view">
        <h2 class="webui-view-title">概览</h2>
        <p class="webui-view-desc">运行信息由主进程实时读取，刷新即可更新。</p>
        <div v-if="!status" class="webui-card webui-skeleton">
            <div class="webui-skeleton-row"></div>
            <div class="webui-skeleton-row is-short"></div>
            <div class="webui-skeleton-row"></div>
        </div>
        <template v-else>
            <div class="webui-grid">
                <div v-for="card in version_cards" :key="card.label" class="webui-card webui-stat">
                    <span class="webui-stat-label">{{ card.label }}</span>
                    <span class="webui-stat-value">{{ card.value }}</span>
                </div>
                <div class="webui-card webui-stat">
                    <span class="webui-stat-label">已加载插件</span>
                    <span class="webui-stat-value">{{ counts.loaded }}</span>
                </div>
                <div class="webui-card webui-stat">
                    <span class="webui-stat-label">已安装插件</span>
                    <span class="webui-stat-value">{{ counts.installed }}</span>
                </div>
            </div>
            <div class="webui-card">
                <h3 class="webui-card-title">路径</h3>
                <div v-for="row in path_rows" :key="row.label" class="webui-kv">
                    <span class="webui-kv-key">{{ row.label }}</span>
                    <span class="webui-kv-value"><code>{{ row.value }}</code></span>
                </div>
            </div>
            <div class="webui-card">
                <h3 class="webui-card-title">加载器更新</h3>
                <div class="webui-actions">
                    <button class="webui-btn" type="button" :disabled="busy === 'update'" @click="checkUpdate">{{ busy === 'update' ? '检查中…' : '检查加载器更新' }}</button>
                    <button class="webui-btn webui-btn-ghost" type="button" :disabled="busy === 'status'" @click="loadStatus">刷新信息</button>
                </div>
                <p v-if="update_result" class="webui-hint">{{ update_result }}</p>
            </div>
        </template>
    </section>
</template>

<style scoped>
/* 概览：版本信息卡片与路径键值行 */
.webui-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.webui-stat-label {
    color: var(--webui-text-mute);
    font-size: 12px;
    letter-spacing: .3px;
}

.webui-stat-value {
    font-size: 16px;
    font-weight: 600;
    word-break: break-all;
}

.webui-kv {
    display: grid;
    grid-template-columns: 88px 1fr;
    gap: 8px 12px;
    align-items: start;
}

.webui-kv-key {
    color: var(--webui-text-mute);
    font-size: 13px;
}

.webui-kv-value {
    word-break: break-all;
    color: var(--webui-text-soft);
}

@media (max-width: 720px) {
    .webui-kv {
        grid-template-columns: 1fr;
        gap: 2px 0;
    }
}
</style>
