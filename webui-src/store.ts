// 全局共享状态与数据操作：四个视图都从这里读写
import { computed, ref } from "vue";
import { errorText, has_token, request } from "./api";
import type {
    LiteLoaderConfig,
    MarketAuthor,
    MarketEntry,
    MarketInstallResult,
    MarketItem,
    MarketPayload,
    MarketUninstallResult,
    OpenResult,
    PluginDeleteResult,
    PluginInfo,
    PluginToggleResult,
    Status,
    StatusPaths,
    UpdateResult,
    Versions
} from "./types";

export { has_token };

export const DEFAULT_ROUTE = "#/overview";
export const ROUTES = ["#/overview", "#/plugins", "#/market", "#/config"];

export interface NavItem {
    hash: string;
    label: string;
}

export const nav_items: NavItem[] = [
    { hash: "#/overview", label: "概览" },
    { hash: "#/plugins", label: "已安装" },
    { hash: "#/market", label: "插件市场" },
    { hash: "#/config", label: "配置" }
];

/** 每个视图的标题与说明：顶栏与页面头部共用同一份文案 */
export interface PageMeta {
    title: string;
    desc: string;
}

export const page_meta: Record<string, PageMeta> = {
    "#/overview": {
        title: "概览",
        desc: "查看运行环境、插件加载情况与本地目录。"
    },
    "#/plugins": {
        title: "已安装",
        desc: "管理插件启用与删除，修改后重启 QQ 生效。"
    },
    "#/market": {
        title: "插件市场",
        desc: "浏览官方插件清单，安装后重启 QQ 生效。"
    },
    "#/config": {
        title: "配置",
        desc: "编辑 LiteLoader 配置，保存前检查 JSON 语法。"
    }
};

// ---- 主题：默认浅色，保留 webui-theme 手动设置 ----

export type Theme = "dark" | "light";

const THEME_STORAGE_KEY = "webui-theme";

// 缺失或非法值回退浅色，与 index.html 同步
function readTheme(): Theme {
    try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        return stored === "dark" ? "dark" : "light";
    }
    catch {
        // localStorage 被禁用时直接用默认值
        return "light";
    }
}

export const theme = ref<Theme>(readTheme());

// 主题同时写进 <html data-theme> 与 localStorage，刷新后保持一致
export function setTheme(next: Theme): void {
    theme.value = next;
    document.documentElement.dataset.theme = next;
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
    }
    catch {
        // 写入失败不影响当前会话的显示
    }
}

export function toggleTheme(): void {
    setTheme(theme.value === "dark" ? "light" : "dark");
}

export const view = ref<string>(resolveRoute());
export const error = ref<string>("");
export const notice = ref<string>("");
export const busy = ref<string>("");
const pending_actions = ref(new Set<string>());
/** 响应式查询；可直接用于模板或 computed，market:<slug> 为安装/卸载共享锁。 */
export function isPending(action: string): boolean { return pending_actions.value.has(action); }
function beginPending(action: string): boolean {
    if (isPending(action)) return false;
    pending_actions.value.add(action);
    busy.value = action;
    return true;
}
function endPending(action: string): void {
    pending_actions.value.delete(action);
    if (busy.value === action) busy.value = Array.from(pending_actions.value).pop() ?? "";
}
export const status = ref<Status | null>(null);
export const plugins = ref<PluginInfo[]>([]);
export const market = ref<MarketEntry[]>([]);
export const market_loading = ref<boolean>(false);
export const market_keyword = ref<string>("");
export const market_type = ref<string>("");
export const plugin_keyword = ref<string>("");
export const config_text = ref<string>("");
export const config_baseline = ref<string>("");
export const config_dirty = computed(() => config_text.value !== config_baseline.value);
export const config_loading = ref<boolean>(false);
export const config_saving = ref<boolean>(false);
export const config_loaded = ref<boolean>(false);
const config_action = "config";
export const update_result = ref<string>("");
export const delete_target = ref<PluginInfo | null>(null);
export const delete_self = ref<boolean>(true);
export const delete_data = ref<boolean>(false);
// 市场卸载走弹窗确认：这里存待卸载的条目，由确认弹窗组件消费
export const uninstall_target = ref<MarketEntry | null>(null);

function resolveRoute(): string {
    const hash = window.location.hash;
    return ROUTES.includes(hash) ? hash : DEFAULT_ROUTE;
}

function parseVersion(value: unknown): number[] {
    return String(value ?? "")
        .replace(/^v/i, "")
        .split(/[.+-]/)
        .map((part) => {
            const number = Number.parseInt(part, 10);
            return Number.isFinite(number) ? number : 0;
        });
}

function isNewerVersion(candidate: unknown, current: unknown): boolean {
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
function normalizeMarketEntry(item: MarketItem | null | undefined, installed_map: Map<string, string>): MarketEntry {
    const manifest = item?.manifest ?? null;
    const repo = typeof item?.repo === "string" ? item.repo : "";
    const slug = typeof manifest?.slug === "string" && manifest.slug !== "" ? manifest.slug : repo;
    const version = typeof manifest?.version === "string" ? manifest.version : "";
    const authors: MarketAuthor[] = Array.isArray(manifest?.authors) ? manifest.authors : [];
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

export function marketDownloadUrl(entry: Pick<MarketEntry, "repo" | "branch">): string {
    return "https://github.com/" + entry.repo + "/archive/refs/heads/" + entry.branch + ".zip";
}

// 统一错误处理：捕获后写进全局错误条，并返回兜底值
export async function run<T>(task: () => T | Promise<T>, fallback?: T): Promise<T | undefined> {
    try {
        const result = await task();
        return result === undefined ? fallback : result;
    }
    catch (caught) {
        error.value = errorText(caught);
        return fallback;
    }
}

export const version_cards = computed(() => {
    const versions: Versions = status.value?.versions ?? {};
    return [
        { label: "LiteLoader", value: versions.liteloader ?? "-" },
        { label: "QQNT", value: versions.qqnt ?? "-" },
        { label: "Electron", value: versions.electron ?? "-" },
        { label: "Node", value: versions.node ?? "-" }
    ];
});

export const path_rows = computed(() => {
    const paths: Partial<StatusPaths> = status.value?.path ?? {};
    return [
        { label: "本体", value: paths.root ?? "-" },
        { label: "配置目录", value: paths.profile ?? "-" },
        { label: "数据目录", value: paths.data ?? "-" },
        { label: "插件目录", value: paths.plugins ?? "-" }
    ];
});

export const counts = computed(() => ({
    loaded: status.value?.loaded ?? 0,
    installed: status.value?.installed ?? 0
}));

export const filtered_plugins = computed(() => {
    const keyword = plugin_keyword.value.trim().toLowerCase();
    if (keyword === "") return plugins.value;
    return plugins.value.filter((plugin) => {
        const haystack = (plugin.slug + " " + plugin.name).toLowerCase();
        return haystack.includes(keyword);
    });
});

export const filtered_market = computed(() => {
    const keyword = market_keyword.value.trim().toLowerCase();
    const type = market_type.value;
    return market.value.filter((entry) => {
        if (type !== "" && entry.type !== type) return false;
        if (keyword === "") return true;
        const haystack = (entry.slug + " " + entry.name + " " + entry.description + " " + entry.repo).toLowerCase();
        return haystack.includes(keyword);
    });
});

export async function loadStatus(): Promise<void> {
    const action = "status";
    if (!beginPending(action)) return;
    try { await run(async () => { status.value = await request<Status>("/api/status"); }); }
    finally { endPending(action); }
}

export async function loadPlugins(): Promise<void> {
    const action = "plugins";
    if (!beginPending(action)) return;
    try { await run(async () => {
        const list = await request<PluginInfo[]>("/api/plugins");
        plugins.value = Array.isArray(list) ? list : [];
    }); } finally { endPending(action); }
}

export async function checkUpdate(): Promise<void> {
    const action = "update";
    if (!beginPending(action)) return;
    update_result.value = "";
    try { await run(async () => {
        const result = await request<UpdateResult>("/api/update?refresh=1");
        const latest = typeof result?.version === "string" ? result.version : "";
        const current = status.value?.versions?.liteloader ?? "";
        if (latest !== "" && isNewerVersion(latest, current)) {
            update_result.value = "发现新版本 " + latest + "（当前 " + current + "）：" + (result?.url ?? "");
        }
        else {
            update_result.value = "当前已是最新版本（" + (current || latest || "未知") + "）";
        }
    }); } finally { endPending(action); }
}

export async function togglePlugin(plugin: PluginInfo): Promise<void> {
    const action = "plugin:" + plugin.slug;
    if (!beginPending(action)) return;
    const next_enabled = !plugin.enabled;
    try { await run(async () => {
        await request<PluginToggleResult>("/api/plugins/" + encodeURIComponent(plugin.slug) + "/enable", {
            method: "POST",
            body: { enabled: next_enabled }
        });
        notice.value = plugin.name + " 已" + (next_enabled ? "启用" : "禁用") + "，重启 QQ 后完全生效";
        const list = await request<PluginInfo[]>("/api/plugins");
        plugins.value = Array.isArray(list) ? list : [];
    }); } finally { endPending(action); }
}

export function openDelete(plugin: PluginInfo): void {
    delete_target.value = plugin;
    delete_self.value = true;
    delete_data.value = false;
}

export function closeDelete(): void {
    delete_target.value = null;
}

export async function confirmDelete(): Promise<void> {
    const target = delete_target.value;
    if (!target) return;
    if (!delete_self.value && !delete_data.value) {
        error.value = "请至少勾选插件本体或数据目录";
        return;
    }
    const action = "delete:" + target.slug;
    if (!beginPending(action)) return;
    try { await run(async () => {
        await request<PluginDeleteResult>("/api/plugins/" + encodeURIComponent(target.slug) + "/delete", {
            method: "POST",
            body: { self: delete_self.value, data: delete_data.value }
        });
        delete_target.value = null;
        notice.value = target.name + " 已标记删除，重启 QQ 后生效";
        const list = await request<PluginInfo[]>("/api/plugins");
        plugins.value = Array.isArray(list) ? list : [];
    }); } finally { endPending(action); }
}

export async function loadMarket(refresh: boolean): Promise<void> {
    const action = "market";
    if (!beginPending(action)) return;
    market_loading.value = true;
    try { await run(async () => {
        const results = await Promise.all([
            request<MarketPayload>("/api/market" + (refresh ? "?refresh=1" : "")),
            request<PluginInfo[]>("/api/plugins")
        ]);
        const market_payload = results[0];
        const installed_list = Array.isArray(results[1]) ? results[1] : [];
        const installed_map = new Map<string, string>(
            installed_list.map((item): [string, string] => [item.slug, item.version ?? ""])
        );
        const raw_list: MarketItem[] = market_payload && Array.isArray(market_payload.data) ? market_payload.data : [];
        market.value = raw_list.map((item) => {
            const entry = normalizeMarketEntry(item, installed_map);
            entry.busy = isPending("market:" + entry.slug);
            return entry;
        });
    }); } finally {
        market_loading.value = false;
        endPending(action);
    }
}

export async function installMarket(entry: MarketEntry): Promise<void> {
    const action = "market:" + entry.slug;
    if (!beginPending(action)) return;
    for (const current of market.value) if (current.slug === entry.slug) current.busy = true;
    entry.busy = true;
    try { await run(async () => {
        await request<MarketInstallResult>("/api/market/install", {
            method: "POST",
            body: { slug: entry.slug, url: marketDownloadUrl(entry) }
        });
        for (const current of [entry, ...market.value.filter((item) => item.slug === entry.slug)]) {
            current.installed = true;
            current.installed_version = entry.version;
            current.has_update = false;
        }
        notice.value = entry.name + " 安装完成，重启 QQ 后生效";
    }); } finally {
        for (const current of market.value) if (current.slug === entry.slug) current.busy = false;
        entry.busy = false;
        endPending(action);
    }
}

// 纯 API 调用：只请求后端并同步条目状态；是否需要确认由调用方（弹窗）决定
export async function uninstallMarket(entry: MarketEntry): Promise<void> {
    const action = "market:" + entry.slug;
    if (!beginPending(action)) return;
    for (const current of market.value) if (current.slug === entry.slug) current.busy = true;
    entry.busy = true;
    try { await run(async () => {
        await request<MarketUninstallResult>("/api/market/uninstall", {
            method: "POST",
            body: { slug: entry.slug, removeData: false }
        });
        for (const current of [entry, ...market.value.filter((item) => item.slug === entry.slug)]) {
            current.installed = false;
            current.installed_version = "";
            current.has_update = false;
        }
        notice.value = entry.name + " 已卸载";
    }); } finally {
        for (const current of market.value) if (current.slug === entry.slug) current.busy = false;
        entry.busy = false;
        endPending(action);
    }
}

export function openUninstall(entry: MarketEntry): void {
    uninstall_target.value = entry;
}

export function closeUninstall(): void {
    uninstall_target.value = null;
}

// 弹窗确认后执行卸载：复用 uninstallMarket，完成后关闭弹窗
export async function confirmUninstall(): Promise<void> {
    const target = uninstall_target.value;
    if (!target || isPending("market:" + target.slug)) return;
    await uninstallMarket(target);
    if (uninstall_target.value === target) uninstall_target.value = null;
}

export async function openDetail(entry: MarketEntry): Promise<void> {
    const action = "detail:" + entry.slug;
    if (!beginPending(action)) return;
    if (!entry.repo) {
        error.value = "该条目没有仓库信息";
        endPending(action);
        return;
    }
    try { await run(() => request<OpenResult>("/api/open", {
        method: "POST",
        body: { kind: "url", value: "https://github.com/" + entry.repo }
    })); } finally { endPending(action); }
}

// 加载和保存共用锁；快照进一步保护非 UI 写入，旧响应不能覆盖后来的草稿。
export async function loadConfig(): Promise<boolean> {
    if (!beginPending(config_action)) return false;
    const snapshot = config_text.value;
    config_loading.value = true;
    try {
        return await run(async () => {
            const config = await request<LiteLoaderConfig>("/api/config");
            if (config_text.value !== snapshot) return false;
            const text = JSON.stringify(config, null, 4);
            config_text.value = text;
            config_baseline.value = text;
            config_loaded.value = true;
            return true;
        }, false) ?? false;
    }
    finally {
        config_loading.value = false;
        endPending(config_action);
    }
}

export async function saveConfig(): Promise<boolean> {
    if (isPending(config_action)) return false;
    const snapshot = config_text.value;
    let parsed: unknown;
    try { parsed = JSON.parse(snapshot); }
    catch (caught) {
        error.value = "JSON 解析失败：" + errorText(caught);
        return false;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        error.value = "配置必须是 JSON 对象";
        return false;
    }
    if (!beginPending(config_action)) return false;
    config_saving.value = true;
    try {
        return await run(async () => {
            const saved = await request<LiteLoaderConfig>("/api/config", { method: "PUT", body: parsed });
            const text = JSON.stringify(saved, null, 4);
            if (config_text.value === snapshot) config_text.value = text;
            config_baseline.value = text;
            config_loaded.value = true;
            notice.value = "配置已保存，插件启用状态等改动需重启 QQ 生效";
            return true;
        }, false) ?? false;
    }
    finally {
        config_saving.value = false;
        endPending(config_action);
    }
}

// 切换 hash 后按当前视图拉取对应数据
export function syncView(): Promise<void | boolean> | undefined {
    if (view.value === "#/overview") return loadStatus();
    if (view.value === "#/plugins") return loadPlugins();
    if (view.value === "#/market") return loadMarket(false);
    if (view.value === "#/config" && !config_loaded.value && !config_dirty.value) return loadConfig();
    return undefined;
}

export { resolveRoute };
