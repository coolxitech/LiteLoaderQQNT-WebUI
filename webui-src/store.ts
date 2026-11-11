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
    { hash: "#/plugins", label: "插件" },
    { hash: "#/market", label: "市场" },
    { hash: "#/config", label: "配置" }
];

export const view = ref<string>(resolveRoute());
export const error = ref<string>("");
export const notice = ref<string>("");
export const busy = ref<string>("");
export const status = ref<Status | null>(null);
export const plugins = ref<PluginInfo[]>([]);
export const market = ref<MarketEntry[]>([]);
export const market_loading = ref<boolean>(false);
export const market_keyword = ref<string>("");
export const market_type = ref<string>("");
export const plugin_keyword = ref<string>("");
export const config_text = ref<string>("");
export const config_loading = ref<boolean>(false);
export const update_result = ref<string>("");
export const delete_target = ref<PluginInfo | null>(null);
export const delete_self = ref<boolean>(true);
export const delete_data = ref<boolean>(false);

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
    busy.value = "status";
    await run(async () => { status.value = await request<Status>("/api/status"); });
    busy.value = "";
}

export async function loadPlugins(): Promise<void> {
    busy.value = "plugins";
    await run(async () => {
        const list = await request<PluginInfo[]>("/api/plugins");
        plugins.value = Array.isArray(list) ? list : [];
    });
    busy.value = "";
}

export async function checkUpdate(): Promise<void> {
    busy.value = "update";
    update_result.value = "";
    await run(async () => {
        const result = await request<UpdateResult>("/api/update?refresh=1");
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

export async function togglePlugin(plugin: PluginInfo): Promise<void> {
    const next_enabled = !plugin.enabled;
    busy.value = "plugin:" + plugin.slug;
    await run(async () => {
        await request<PluginToggleResult>("/api/plugins/" + encodeURIComponent(plugin.slug) + "/enable", {
            method: "POST",
            body: { enabled: next_enabled }
        });
        notice.value = plugin.name + " 已" + (next_enabled ? "启用" : "禁用") + "，重启 QQ 后完全生效";
        const list = await request<PluginInfo[]>("/api/plugins");
        plugins.value = Array.isArray(list) ? list : [];
    });
    busy.value = "";
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
    busy.value = "delete:" + target.slug;
    await run(async () => {
        await request<PluginDeleteResult>("/api/plugins/" + encodeURIComponent(target.slug) + "/delete", {
            method: "POST",
            body: { self: delete_self.value, data: delete_data.value }
        });
        delete_target.value = null;
        notice.value = target.name + " 已标记删除，重启 QQ 后生效";
        const list = await request<PluginInfo[]>("/api/plugins");
        plugins.value = Array.isArray(list) ? list : [];
    });
    busy.value = "";
}

export async function loadMarket(refresh: boolean): Promise<void> {
    market_loading.value = true;
    await run(async () => {
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
        market.value = raw_list.map((item) => normalizeMarketEntry(item, installed_map));
    });
    market_loading.value = false;
}

export async function installMarket(entry: MarketEntry): Promise<void> {
    if (entry.busy) return;
    entry.busy = true;
    await run(async () => {
        await request<MarketInstallResult>("/api/market/install", {
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

export async function uninstallMarket(entry: MarketEntry): Promise<void> {
    if (entry.busy) return;
    if (!window.confirm("确定卸载 " + entry.name + "？插件目录会被直接删除。")) return;
    entry.busy = true;
    await run(async () => {
        await request<MarketUninstallResult>("/api/market/uninstall", {
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

export async function openDetail(entry: MarketEntry): Promise<void> {
    if (!entry.repo) {
        error.value = "该条目没有仓库信息";
        return;
    }
    await run(() => request<OpenResult>("/api/open", {
        method: "POST",
        body: { kind: "url", value: "https://github.com/" + entry.repo }
    }));
}

export async function loadConfig(): Promise<void> {
    config_loading.value = true;
    await run(async () => {
        const config = await request<LiteLoaderConfig>("/api/config");
        config_text.value = JSON.stringify(config, null, 4);
    });
    config_loading.value = false;
}

export async function saveConfig(): Promise<void> {
    let parsed: unknown;
    try { parsed = JSON.parse(config_text.value); }
    catch (caught) {
        error.value = "JSON 解析失败：" + errorText(caught);
        return;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        error.value = "配置必须是 JSON 对象";
        return;
    }
    busy.value = "config";
    await run(async () => {
        const saved = await request<LiteLoaderConfig>("/api/config", { method: "PUT", body: parsed });
        config_text.value = JSON.stringify(saved, null, 4);
        notice.value = "配置已保存，插件启用状态等改动需重启 QQ 生效";
    });
    busy.value = "";
}

// 切换 hash 后按当前视图拉取对应数据
export function syncView(): Promise<void> | undefined {
    if (view.value === "#/overview") return loadStatus();
    if (view.value === "#/plugins") return loadPlugins();
    if (view.value === "#/market") return loadMarket(false);
    if (view.value === "#/config") return loadConfig();
    return undefined;
}

export { resolveRoute };
