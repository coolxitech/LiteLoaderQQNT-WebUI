<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { ShieldAlert } from "lucide-vue-next";
import Overview from "./views/Overview.vue";
import Plugins from "./views/Plugins.vue";
import Market from "./views/Market.vue";
import Config from "./views/Config.vue";
import Toaster from "@/components/ui/Toaster.vue";
import { useToast } from "@/components/ui/useToast";
import AppSidebar from "@/components/shell/AppSidebar.vue";
import AppTopbar from "@/components/shell/AppTopbar.vue";
import MobileNav from "@/components/shell/MobileNav.vue";
// nav_items 由 AppSidebar / MobileNav 自己消费，外壳这里只需要视图元信息
import { DEFAULT_ROUTE, error, has_token, notice, page_meta, resolveRoute, syncView, view } from "./store";

// 当前视图的标题与说明：未知路由回退到默认页，保证顶栏永远有文案
const meta = computed(() => page_meta[view.value] ?? page_meta[DEFAULT_ROUTE]);

// 示例地址跟随真实主机与端口，避免写死 3210 误导（端口可在 data/webui/config.json 改）
const local_url = "http://" + window.location.host + "/?token=...";

// store 里的全局提示统一转成 toast，视图侧无需关心提示条
const { pushToast } = useToast();

watch(error, (value) => {
    if (value === "") return;
    // 错误文案通常较长（JSON 解析位置、连接失败原因），给 0 表示常驻，由用户手动关闭
    pushToast({ tone: "danger", title: value, timeout: 0 });
    error.value = "";
});

watch(notice, (value) => {
    if (value === "") return;
    pushToast({ tone: "ok", title: value });
    notice.value = "";
});

// 跳过链接：href 保留 #app-main 作为无 JS 时的兜底，点击时改为直接聚焦主内容区，
// 否则 location.hash 会被改写成 #app-main，触发 hashchange 后路由回落成概览页
function focus_main(): void {
    const main = document.getElementById("app-main");
    if (main) main.focus();
}

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
    <!-- 缺少 token：全屏 gate，不渲染任何导航外壳 -->
    <div v-if="!has_token" class="app-gate">
        <section class="app-gate__card">
            <span class="app-gate__icon">
                <ShieldAlert :size="24" aria-hidden="true" />
            </span>
            <h1 class="app-gate__title">缺少访问令牌</h1>
            <p class="app-gate__text">
                请用控制台输出的带 token 地址打开，或在 LiteLoader 设置的 WebUI 一栏点「打开」。
            </p>
            <code class="app-gate__sample">{{ local_url }}</code>
        </section>
    </div>

    <div v-else class="app-shell">
        <a class="skip-link" href="#app-main" @click.prevent="focus_main">跳到主要内容</a>
        <AppSidebar />
        <div class="app-body">
            <AppTopbar :title="meta.title" :desc="meta.desc" />
            <MobileNav />
            <main id="app-main" class="app-main" tabindex="-1">
                <div class="app-main__inner">
                    <div>
                        <Overview v-if="view === '#/overview'" key="overview" />
                        <Plugins v-else-if="view === '#/plugins'" key="plugins" />
                        <Market v-else-if="view === '#/market'" key="market" />
                        <Config v-else-if="view === '#/config'" key="config" />
                    </div>
                </div>
            </main>
        </div>
        <Toaster />
    </div>
</template>

<style scoped>
.app-shell { display:grid; grid-template-columns:208px minmax(0,1fr); min-height:100vh; }
.app-body { min-width:0; }
.app-main { width:100%; max-width:1164px; margin:0 auto; padding:0 32px 48px; }
.app-main:focus:not(:focus-visible) { outline:none; }
.app-gate { min-height:100vh; display:grid; place-items:center; padding:24px; }
.app-gate__card { width:min(520px,100%); padding:32px; border:1px solid var(--line); border-radius:8px; background:var(--surface-1); }
.app-gate__icon { color:var(--fg-muted); }
.app-gate__title { font-size:24px; margin:12px 0; }
.app-gate__text { color:var(--fg-muted); }
.app-gate__sample { display:block; margin-top:16px; overflow-wrap:anywhere; }
@media(max-width:900px) { .app-shell { display:block; } .app-shell :deep(.app-sidebar) { display:none; } .app-main { padding:20px 16px 32px; } }
</style>
