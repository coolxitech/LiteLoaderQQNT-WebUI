<script setup lang="ts">
import { market, market_loading, market_keyword, market_type, filtered_market, loadMarket, installMarket, uninstallMarket, openDetail } from "../store";
</script>

<template>
    <section class="webui-view">
        <h2 class="webui-view-title">插件市场</h2>
        <p class="webui-view-desc">列表来自 LiteLoaderQQNT 官方插件清单，安装会下载仓库归档并解压到插件目录，重启 QQ 后生效。</p>
        <div class="webui-toolbar">
            <input class="webui-input" type="search" v-model="market_keyword" placeholder="搜索名称、slug 或描述">
            <select class="webui-select" v-model="market_type">
                <option value="">全部类型</option>
                <option value="extension">extension</option>
                <option value="theme">theme</option>
                <option value="framework">framework</option>
            </select>
            <button class="webui-btn webui-btn-ghost" type="button" :disabled="market_loading" @click="loadMarket(true)">{{ market_loading ? '加载中…' : '刷新列表' }}</button>
        </div>
        <div v-if="market_loading && !market.length" class="webui-grid">
            <div v-for="index in 6" :key="index" class="webui-card webui-skeleton">
                <div class="webui-skeleton-row"></div>
                <div class="webui-skeleton-row is-short"></div>
            </div>
        </div>
        <div v-else-if="!filtered_market.length" class="webui-card webui-empty">没有匹配的插件</div>
        <div v-else class="webui-grid">
            <article v-for="entry in filtered_market" :key="entry.slug" class="webui-card webui-market-card">
                <img v-if="entry.icon && entry.icon.indexOf('http') === 0" class="webui-market-icon" :src="entry.icon" alt="" referrerpolicy="no-referrer">
                <div v-else class="webui-market-icon webui-market-avatar">{{ entry.name.slice(0, 1) }}</div>
                <div class="webui-market-body">
                    <div class="webui-market-title">
                        <span>{{ entry.name }}</span>
                        <span class="webui-tag">{{ entry.type }}</span>
                        <span v-if="entry.installed" class="webui-tag is-ok">已安装</span>
                        <span v-if="entry.has_update" class="webui-tag is-warn">可更新</span>
                    </div>
                    <p class="webui-market-desc">{{ entry.description || '暂无描述' }}</p>
                    <div class="webui-market-meta">{{ entry.version ? 'v' + entry.version : '版本未知' }}<span v-if="entry.authors_text"> · {{ entry.authors_text }}</span></div>
                    <div class="webui-market-meta">{{ entry.repo }}</div>
                    <div v-if="entry.error" class="webui-market-meta">清单读取失败：{{ entry.error }}</div>
                    <div class="webui-actions">
                        <button v-if="!entry.installed" class="webui-btn webui-btn-sm" type="button" :disabled="entry.busy || !entry.repo" @click="installMarket(entry)">{{ entry.busy ? '安装中…' : '安装' }}</button>
                        <button v-else-if="entry.has_update" class="webui-btn webui-btn-sm" type="button" :disabled="entry.busy" @click="installMarket(entry)">{{ entry.busy ? '安装中…' : '更新' }}</button>
                        <button v-if="entry.installed" class="webui-btn webui-btn-sm webui-btn-danger" type="button" :disabled="entry.busy" @click="uninstallMarket(entry)">卸载</button>
                        <button class="webui-btn webui-btn-sm webui-btn-ghost" type="button" :disabled="!entry.repo" @click="openDetail(entry)">详情</button>
                    </div>
                </div>
            </article>
        </div>
    </section>
</template>

<style scoped>
/* 市场卡片 */
.webui-market-card {
    display: flex;
    gap: 12px;
    align-items: flex-start;
}

.webui-market-icon {
    flex: 0 0 44px;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    object-fit: cover;
    background: var(--webui-brand-soft);
}

.webui-market-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--webui-brand);
    font-weight: 600;
    font-size: 18px;
    text-transform: uppercase;
}

.webui-market-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.webui-market-title {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-weight: 600;
}

.webui-market-desc {
    margin: 0;
    color: var(--webui-text-soft);
    font-size: 13px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
}

.webui-market-meta {
    color: var(--webui-text-mute);
    font-size: 12px;
    word-break: break-all;
}
</style>
