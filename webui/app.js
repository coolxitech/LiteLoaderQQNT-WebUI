import { createApp, ref, computed, onMounted } from "./vendor/vue.esm-browser.prod.js";

const TOKEN_KEY = "webui-token";
const DEFAULT_ROUTE = "#/overview";
const ROUTES = ["#/overview", "#/plugins", "#/market", "#/config"];
const NAV_ITEMS = [
    { hash: "#/overview", label: "概览" },
    { hash: "#/plugins", label: "插件" },
    { hash: "#/market", label: "市场" },
    { hash: "#/config", label: "配置" }
];

// 地址栏里的 token 只用于首次握手，随后存进 sessionStorage 并从地址栏移除
function stripTokenFromUrl() {
    try {
        const params = new URLSearchParams(window.location.search);
        params.delete("token");
        const search = params.toString();
        const next = window.location.pathname + (search === "" ? "" : "?" + search) + window.location.hash;
        window.history.replaceState(null, "", next);
    }
    catch { /* 替换失败不影响功能，只是地址栏留着 token */ }
}

function readTokenFromUrl() {
    try { return new URLSearchParams(window.location.search).get("token") ?? ""; }
    catch { return ""; }
}

const TOKEN = (() => {
    const from_url = readTokenFromUrl();
    if (from_url !== "") {
        try { window.sessionStorage.setItem(TOKEN_KEY, from_url); }
        catch { /* 隐私模式下 sessionStorage 不可用，本次仍然能用 token */ }
        stripTokenFromUrl();
        return from_url;
    }
    try { return window.sessionStorage.getItem(TOKEN_KEY) ?? ""; }
    catch { return ""; }
})();

async function request(path, options = {}) {
    const init = {
        method: options.method ?? "GET",
        headers: { "X-WebUI-Token": TOKEN },
        cache: "no-store"
    };
    if (options.body !== undefined) {
        init.headers["content-type"] = "application/json";
        init.body = JSON.stringify(options.body);
    }
    let response;
    try { response = await fetch(path, init); }
    catch (error) { throw new Error("无法连接 WebUI 服务：" + (error?.message ?? error)); }
    let payload = null;
    try { payload = await response.json(); }
    catch { payload = null; }
    if (!response.ok || !payload || payload.ok !== true) {
        throw new Error(payload?.message ?? "请求失败：HTTP " + response.status);
    }
    return payload.data;
}

function resolveRoute() {
    const hash = window.location.hash;
    return ROUTES.includes(hash) ? hash : DEFAULT_ROUTE;
}

function parseVersion(value) {
    return String(value ?? "")
        .replace(/^v/i, "")
        .split(/[.+-]/)
        .map((part) => {
            const number = Number.parseInt(part, 10);
            return Number.isFinite(number) ? number : 0;
        });
}

function isNewerVersion(candidate, current) {
    const left = parseVersion(candidate);
    const right = parseVersion(current);
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
        const a = left[index] ?? 0;
        const b = right[index] ?? 0;
        if (a > b) return true;
        if (a < b) return false;
    }
    return false;
}

// 市场条目原始结构来自主进程：{ repo, branch, manifest, error }
function normalizeMarketEntry(item, installed_map) {
    const manifest = item?.manifest ?? null;
    const repo = typeof item?.repo === "string" ? item.repo : "";
    const slug = typeof manifest?.slug === "string" && manifest.slug !== "" ? manifest.slug : repo;
    const version = typeof manifest?.version === "string" ? manifest.version : "";
    const authors = Array.isArray(manifest?.authors) ? manifest.authors : [];
    const installed = installed_map.has(slug);
    const installed_version = installed_map.get(slug) ?? "";
    return {
        slug,
        repo,
        branch: typeof item?.branch === "string" && item.branch !== "" ? item.branch : "main",
        name: typeof manifest?.name === "string" && manifest.name !== "" ? manifest.name : slug,
        version,
        type: typeof manifest?.type === "string" && manifest.type !== "" ? manifest.type : "extension",
        description: typeof manifest?.description === "string" ? manifest.description : "",
        icon: typeof manifest?.icon === "string" ? manifest.icon : "",
        authors_text: authors.map((author) => author?.name).filter(Boolean).join("、"),
        error: item?.error ?? (manifest ? "" : "未取到 manifest.json"),
        installed,
        installed_version,
        has_update: installed && version !== "" ? isNewerVersion(version, installed_version) : false,
        busy: false
    };
}

function marketDownloadUrl(entry) {
    return "https://github.com/" + entry.repo + "/archive/refs/heads/" + entry.branch + ".zip";
}

const template = `
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
            <section v-if="view === '#/overview'" class="webui-view">
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

            <section v-else-if="view === '#/plugins'" class="webui-view">
                <h2 class="webui-view-title">插件</h2>
                <p class="webui-view-desc">启用状态写入 LiteLoader 配置的 disabled_plugins；标记删除在下次启动 QQ 时执行。</p>
                <div class="webui-toolbar">
                    <input class="webui-input" type="search" v-model="plugin_keyword" placeholder="搜索插件名称或 slug">
                    <button class="webui-btn webui-btn-ghost" type="button" :disabled="busy === 'plugins'" @click="loadPlugins">{{ busy === 'plugins' ? '刷新中…' : '刷新' }}</button>
                </div>
                <div v-if="!plugins.length" class="webui-card webui-empty">还没有已安装的插件</div>
                <div v-else class="webui-table-wrap">
                    <table class="webui-table">
                        <thead>
                            <tr>
                                <th>插件</th>
                                <th>版本</th>
                                <th>类型</th>
                                <th>状态</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="plugin in filtered_plugins" :key="plugin.slug">
                                <td>
                                    <div class="webui-plugin-name">{{ plugin.name }}</div>
                                    <div class="webui-plugin-slug">{{ plugin.slug }}</div>
                                </td>
                                <td>{{ plugin.version || '-' }}</td>
                                <td>{{ plugin.type }}</td>
                                <td>
                                    <div class="webui-tags">
                                        <span :class="['webui-tag', plugin.enabled ? 'is-ok' : 'is-off']">{{ plugin.enabled ? '已启用' : '已禁用' }}</span>
                                        <span :class="['webui-tag', plugin.loaded ? 'is-ok' : 'is-off']">{{ plugin.loaded ? '已加载' : '未加载' }}</span>
                                        <span v-if="plugin.incompatible" class="webui-tag is-warn">平台不兼容</span>
                                    </div>
                                </td>
                                <td>
                                    <div class="webui-actions">
                                        <button class="webui-btn webui-btn-sm" type="button" :disabled="busy === 'plugin:' + plugin.slug" @click="togglePlugin(plugin)">{{ plugin.enabled ? '禁用' : '启用' }}</button>
                                        <button class="webui-btn webui-btn-sm webui-btn-danger" type="button" :disabled="busy === 'delete:' + plugin.slug" @click="openDelete(plugin)">标记删除</button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-if="delete_target" class="webui-modal-mask" @click.self="closeDelete">
                    <div class="webui-modal">
                        <h3 class="webui-modal-title">标记删除 {{ delete_target.name }}</h3>
                        <p class="webui-hint is-warn">删除会在下次启动 QQ 时执行，本次运行中插件仍然可用。</p>
                        <label class="webui-checkbox">
                            <input type="checkbox" v-model="delete_self">
                            <span>删除插件本体（plugins/{{ delete_target.slug }}）</span>
                        </label>
                        <label class="webui-checkbox">
                            <input type="checkbox" v-model="delete_data">
                            <span>删除插件数据（data/{{ delete_target.slug }}）</span>
                        </label>
                        <div class="webui-modal-actions">
                            <button class="webui-btn webui-btn-ghost" type="button" @click="closeDelete">取消</button>
                            <button class="webui-btn webui-btn-danger" type="button" :disabled="busy === 'delete:' + delete_target.slug" @click="confirmDelete">确认标记</button>
                        </div>
                    </div>
                </div>
            </section>

            <section v-else-if="view === '#/market'" class="webui-view">
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

            <section v-else-if="view === '#/config'" class="webui-view">
                <h2 class="webui-view-title">配置</h2>
                <p class="webui-view-desc">直接编辑 LiteLoader 自身配置（data/LiteLoader/config.json）。保存前会校验 JSON 语法，部分改动需重启 QQ 生效。</p>
                <div class="webui-toolbar">
                    <button class="webui-btn webui-btn-ghost" type="button" :disabled="config_loading" @click="loadConfig">{{ config_loading ? '读取中…' : '重新加载' }}</button>
                    <button class="webui-btn" type="button" :disabled="busy === 'config'" @click="saveConfig">{{ busy === 'config' ? '保存中…' : '保存' }}</button>
                </div>
                <div v-if="config_loading && !config_text" class="webui-card webui-skeleton">
                    <div class="webui-skeleton-row"></div>
                    <div class="webui-skeleton-row"></div>
                    <div class="webui-skeleton-row is-short"></div>
                </div>
                <textarea v-else class="webui-textarea" v-model="config_text" spellcheck="false"></textarea>
            </section>
        </main>
    </template>
</div>
`;

function setup() {
    const has_token = TOKEN !== "";
    const view = ref(resolveRoute());
    const error = ref("");
    const notice = ref("");
    const busy = ref("");
    const status = ref(null);
    const plugins = ref([]);
    const market = ref([]);
    const market_loading = ref(false);
    const market_keyword = ref("");
    const market_type = ref("");
    const plugin_keyword = ref("");
    const config_text = ref("");
    const config_loading = ref(false);
    const update_result = ref("");
    const delete_target = ref(null);
    const delete_self = ref(true);
    const delete_data = ref(false);

    async function run(task, fallback) {
        try {
            const result = await task();
            return result === undefined ? fallback : result;
        }
        catch (caught) {
            error.value = caught?.message ?? String(caught);
            return fallback;
        }
    }

    const version_cards = computed(() => {
        const versions = status.value?.versions ?? {};
        return [
            { label: "LiteLoader", value: versions.liteloader ?? "-" },
            { label: "QQNT", value: versions.qqnt ?? "-" },
            { label: "Electron", value: versions.electron ?? "-" },
            { label: "Node", value: versions.node ?? "-" }
        ];
    });

    const path_rows = computed(() => {
        const paths = status.value?.path ?? {};
        return [
            { label: "本体", value: paths.root ?? "-" },
            { label: "配置目录", value: paths.profile ?? "-" },
            { label: "数据目录", value: paths.data ?? "-" },
            { label: "插件目录", value: paths.plugins ?? "-" }
        ];
    });

    const counts = computed(() => ({
        loaded: status.value?.loaded ?? 0,
        installed: status.value?.installed ?? 0
    }));

    const filtered_plugins = computed(() => {
        const keyword = plugin_keyword.value.trim().toLowerCase();
        if (keyword === "") return plugins.value;
        return plugins.value.filter((plugin) => {
            const haystack = (plugin.slug + " " + plugin.name).toLowerCase();
            return haystack.includes(keyword);
        });
    });

    const filtered_market = computed(() => {
        const keyword = market_keyword.value.trim().toLowerCase();
        const type = market_type.value;
        return market.value.filter((entry) => {
            if (type !== "" && entry.type !== type) return false;
            if (keyword === "") return true;
            const haystack = (entry.slug + " " + entry.name + " " + entry.description + " " + entry.repo).toLowerCase();
            return haystack.includes(keyword);
        });
    });

    async function loadStatus() {
        busy.value = "status";
        await run(async () => { status.value = await request("/api/status"); });
        busy.value = "";
    }

    async function loadPlugins() {
        busy.value = "plugins";
        await run(async () => {
            const list = await request("/api/plugins");
            plugins.value = Array.isArray(list) ? list : [];
        });
        busy.value = "";
    }

    async function checkUpdate() {
        busy.value = "update";
        update_result.value = "";
        await run(async () => {
            const result = await request("/api/update?refresh=1");
            const latest = typeof result?.version === "string" ? result.version : "";
            const current = status.value?.versions?.liteloader ?? "";
            if (latest !== "" && isNewerVersion(latest, current)) {
                update_result.value = "发现新版本 " + latest + "（当前 " + current + "）：" + (result?.url ?? "");
            }
            else {
                update_result.value = "当前已是最新版本（" + (current || latest || "未知") + "）";
            }
        });
        busy.value = "";
    }

    async function togglePlugin(plugin) {
        const next_enabled = !plugin.enabled;
        busy.value = "plugin:" + plugin.slug;
        await run(async () => {
            await request("/api/plugins/" + encodeURIComponent(plugin.slug) + "/enable", {
                method: "POST",
                body: { enabled: next_enabled }
            });
            notice.value = plugin.name + " 已" + (next_enabled ? "启用" : "禁用") + "，重启 QQ 后完全生效";
            const list = await request("/api/plugins");
            plugins.value = Array.isArray(list) ? list : [];
        });
        busy.value = "";
    }

    function openDelete(plugin) {
        delete_target.value = plugin;
        delete_self.value = true;
        delete_data.value = false;
    }

    function closeDelete() {
        delete_target.value = null;
    }

    async function confirmDelete() {
        const target = delete_target.value;
        if (!target) return;
        if (!delete_self.value && !delete_data.value) {
            error.value = "请至少勾选插件本体或数据目录";
            return;
        }
        busy.value = "delete:" + target.slug;
        await run(async () => {
            await request("/api/plugins/" + encodeURIComponent(target.slug) + "/delete", {
                method: "POST",
                body: { self: delete_self.value, data: delete_data.value }
            });
            delete_target.value = null;
            notice.value = target.name + " 已标记删除，重启 QQ 后生效";
            const list = await request("/api/plugins");
            plugins.value = Array.isArray(list) ? list : [];
        });
        busy.value = "";
    }

    async function loadMarket(refresh) {
        market_loading.value = true;
        await run(async () => {
            const results = await Promise.all([
                request("/api/market" + (refresh ? "?refresh=1" : "")),
                request("/api/plugins")
            ]);
            const installed_list = Array.isArray(results[1]) ? results[1] : [];
            const installed_map = new Map(installed_list.map((item) => [item.slug, item.version ?? ""]));
            const raw_list = Array.isArray(results[0]?.data) ? results[0].data : [];
            market.value = raw_list.map((item) => normalizeMarketEntry(item, installed_map));
        });
        market_loading.value = false;
    }

    async function installMarket(entry) {
        if (entry.busy) return;
        entry.busy = true;
        await run(async () => {
            await request("/api/market/install", {
                method: "POST",
                body: { slug: entry.slug, url: marketDownloadUrl(entry) }
            });
            entry.installed = true;
            entry.installed_version = entry.version;
            entry.has_update = false;
            notice.value = entry.name + " 安装完成，重启 QQ 后生效";
        });
        entry.busy = false;
    }

    async function uninstallMarket(entry) {
        if (entry.busy) return;
        if (!window.confirm("确定卸载 " + entry.name + "？插件目录会被直接删除。")) return;
        entry.busy = true;
        await run(async () => {
            await request("/api/market/uninstall", {
                method: "POST",
                body: { slug: entry.slug, removeData: false }
            });
            entry.installed = false;
            entry.installed_version = "";
            entry.has_update = false;
            notice.value = entry.name + " 已卸载";
        });
        entry.busy = false;
    }

    async function openDetail(entry) {
        if (!entry.repo) {
            error.value = "该条目没有仓库信息";
            return;
        }
        await run(() => request("/api/open", {
            method: "POST",
            body: { kind: "url", value: "https://github.com/" + entry.repo }
        }));
    }

    async function loadConfig() {
        config_loading.value = true;
        await run(async () => {
            const config = await request("/api/config");
            config_text.value = JSON.stringify(config, null, 4);
        });
        config_loading.value = false;
    }

    async function saveConfig() {
        let parsed;
        try { parsed = JSON.parse(config_text.value); }
        catch (caught) {
            error.value = "JSON 解析失败：" + (caught?.message ?? caught);
            return;
        }
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            error.value = "配置必须是 JSON 对象";
            return;
        }
        busy.value = "config";
        await run(async () => {
            const saved = await request("/api/config", { method: "PUT", body: parsed });
            config_text.value = JSON.stringify(saved, null, 4);
            notice.value = "配置已保存，插件启用状态等改动需重启 QQ 生效";
        });
        busy.value = "";
    }

    function syncView() {
        if (view.value === "#/overview") return loadStatus();
        if (view.value === "#/plugins") return loadPlugins();
        if (view.value === "#/market") return loadMarket(false);
        if (view.value === "#/config") return loadConfig();
        return undefined;
    }

    onMounted(() => {
        if (!has_token) return;
        window.addEventListener("hashchange", () => {
            view.value = resolveRoute();
            syncView();
        });
        syncView();
    });

    return {
        has_token,
        view,
        error,
        notice,
        busy,
        status,
        plugins,
        market,
        market_loading,
        market_keyword,
        market_type,
        plugin_keyword,
        config_text,
        config_loading,
        update_result,
        delete_target,
        delete_self,
        delete_data,
        nav_items: NAV_ITEMS,
        version_cards,
        path_rows,
        counts,
        filtered_plugins,
        filtered_market,
        loadStatus,
        loadPlugins,
        checkUpdate,
        togglePlugin,
        openDelete,
        closeDelete,
        confirmDelete,
        loadMarket,
        installMarket,
        uninstallMarket,
        openDetail,
        loadConfig,
        saveConfig
    };
}

createApp({ setup, template }).mount("#app");
