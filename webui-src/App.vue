<script setup lang="ts">
import { onMounted } from "vue";
import Overview from "./views/Overview.vue";
import Plugins from "./views/Plugins.vue";
import Market from "./views/Market.vue";
import Config from "./views/Config.vue";
import { has_token, view, error, notice, nav_items, resolveRoute, syncView } from "./store";

onMounted(() => {
    if (!has_token) return;
    window.addEventListener("hashchange", () => {
        view.value = resolveRoute();
        syncView();
    });
    syncView();
});
</script>

<template>
    <div class="webui-app">
        <div v-if="!has_token" class="webui-gate">
            <h1 class="webui-gate-title">缺少 token</h1>
            <p class="webui-gate-text">请用控制台输出的带 token 地址打开，例如 http://127.0.0.1:3210/?token=...<br>也可以在 LiteLoader 设置的 WebUI 一栏点「打开」。</p>
        </div>
        <template v-else>
            <header class="webui-header">
                <div class="webui-brand">LiteLoaderQQNT WebUI</div>
                <nav class="webui-nav">
                    <a v-for="item in nav_items" :key="item.hash" :href="item.hash" :class="['webui-nav-item', { 'is-active': view === item.hash }]">{{ item.label }}</a>
                </nav>
            </header>
            <div v-if="error" class="webui-error">
                <span class="webui-error-text">{{ error }}</span>
                <button class="webui-btn webui-btn-ghost webui-btn-sm" type="button" @click="error = ''">关闭</button>
            </div>
            <div v-else-if="notice" class="webui-notice">
                <span class="webui-notice-text">{{ notice }}</span>
                <button class="webui-btn webui-btn-ghost webui-btn-sm" type="button" @click="notice = ''">关闭</button>
            </div>
            <main class="webui-main">
                <Overview v-if="view === '#/overview'" />
                <Plugins v-else-if="view === '#/plugins'" />
                <Market v-else-if="view === '#/market'" />
                <Config v-else-if="view === '#/config'" />
            </main>
        </template>
    </div>
</template>

<style scoped>
/* 外壳布局：应用容器、顶部导航、主区域与提示条 */
.webui-app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.webui-header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 24px;
    padding: 12px 24px;
    background: var(--webui-surface);
    border-bottom: 1px solid var(--webui-border);
}

.webui-brand {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: .2px;
}

.webui-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.webui-nav-item {
    padding: 5px 12px;
    border-radius: 999px;
    color: var(--webui-text-soft);
    text-decoration: none;
    font-size: 13.5px;
    transition: background-color .15s ease, color .15s ease;
}

.webui-nav-item:hover {
    background: var(--webui-surface-alt);
    color: var(--webui-text);
}

.webui-nav-item.is-active {
    background: var(--webui-brand-soft);
    color: var(--webui-brand);
    font-weight: 600;
}

.webui-main {
    flex: 1;
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
    padding: 20px 24px 56px;
}

/* 提示条 */
.webui-error {
    position: sticky;
    top: 57px;
    z-index: 9;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 12px 24px 0;
    padding: 10px 14px;
    border: 1px solid transparent;
    border-radius: var(--webui-radius-sm);
    background: var(--webui-danger-soft);
    color: var(--webui-danger);
    font-size: 13px;
}

.webui-error-text {
    flex: 1;
    word-break: break-word;
}

.webui-notice {
    position: sticky;
    top: 57px;
    z-index: 9;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 12px 24px 0;
    padding: 10px 14px;
    border: 1px solid transparent;
    border-radius: var(--webui-radius-sm);
    background: var(--webui-ok-soft);
    color: var(--webui-ok);
    font-size: 13px;
}

.webui-notice-text {
    flex: 1;
    word-break: break-word;
}

.webui-notice .webui-btn-ghost {
    color: var(--webui-ok);
    border-color: transparent;
}

/* token 缺失页 */
.webui-gate {
    max-width: 560px;
    margin: 80px auto;
    padding: 24px;
    background: var(--webui-surface);
    border: 1px solid var(--webui-border);
    border-radius: var(--webui-radius);
    box-shadow: var(--webui-shadow);
    text-align: center;
}

.webui-gate-title {
    margin: 0 0 8px;
    font-size: 17px;
    font-weight: 600;
}

.webui-gate-text {
    margin: 0;
    color: var(--webui-text-soft);
    font-size: 13.5px;
    word-break: break-word;
}

@media (max-width: 720px) {
    .webui-header {
        padding: 10px 16px;
    }

    .webui-main {
        padding: 16px 16px 40px;
    }

    .webui-error {
        margin: 10px 16px 0;
    }

    .webui-notice {
        margin: 10px 16px 0;
    }
}
</style>
