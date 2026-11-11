// 前端侧的 /api/* 响应类型与视图数据模型。
// 这里的类型描述的是「后端已经返回、前端按此消费」的契约：
// 主进程侧透传的第三方 manifest 字段在前端一律按字符串使用（与原 JS 行为一致）。

/** 后端统一响应包：成功 { ok: true, data }，失败 { ok: false, message } */
export interface ApiResponse<T> {
    ok: boolean;
    data: T;
    message?: string;
}

/** LiteLoader.versions */
export interface Versions {
    liteloader?: string;
    qqnt?: string;
    electron?: string;
    node?: string;
    chrome?: string;
    [key: string]: string | undefined;
}

/** LiteLoader.path：未初始化时可能为 null */
export interface StatusPaths {
    root: string | null;
    profile: string | null;
    data: string | null;
    plugins: string | null;
}

/** GET /api/status 的 data */
export interface Status {
    versions: Versions;
    path: StatusPaths;
    loaded: number;
    installed: number;
}

/** GET /api/plugins 数组的单项 */
export interface PluginInfo {
    slug: string;
    name: string;
    version: string | null;
    type: string;
    enabled: boolean;
    loaded: boolean;
    incompatible: boolean;
}

/** 插件市场条目里的 manifest.json 摘要 */
export interface MarketAuthor {
    name?: string;
    [key: string]: unknown;
}

export interface MarketManifest {
    slug?: string;
    name?: string;
    version?: string;
    type?: string;
    description?: string;
    icon?: string;
    authors?: MarketAuthor[];
    [key: string]: unknown;
}

/** GET /api/market 透传的 market.list() 数组单项 */
export interface MarketItem {
    repo?: string;
    branch?: string;
    manifest?: MarketManifest | null;
    error?: string | null;
}

/** GET /api/market 的 data（market.list() 的原始返回） */
export interface MarketPayload {
    success?: boolean;
    message?: string;
    data?: MarketItem[];
    [key: string]: unknown;
}

/** 视图里使用的市场条目：由 MarketItem 归一化而来 */
export interface MarketEntry {
    slug: string;
    repo: string;
    branch: string;
    name: string;
    version: string;
    type: string;
    description: string;
    icon: string;
    authors_text: string;
    error: string;
    installed: boolean;
    installed_version: string;
    has_update: boolean;
    busy: boolean;
}

/** GET /api/update 的 data（api.update.check() 的原始返回） */
export interface UpdateResult {
    success?: boolean;
    message?: string;
    version?: string;
    url?: string;
    [key: string]: unknown;
}

/** GET / PUT /api/config 的 data：LiteLoader 自身配置 */
export interface LiteLoaderConfig {
    enable_plugins?: boolean;
    disabled_plugins?: string[];
    deleting_plugins?: Record<string, unknown>;
    [key: string]: unknown;
}

/** POST /api/plugins/:slug/enable 的 data */
export interface PluginToggleResult {
    slug: string;
    enabled: boolean;
}

/** POST /api/plugins/:slug/delete 的 data */
export interface PluginDeleteResult {
    slug: string;
    self: boolean;
    data: boolean;
    restart_required: boolean;
}

/** POST /api/market/install 的 data */
export interface MarketInstallResult {
    slug: string;
    restart_required: boolean;
}

/** POST /api/market/uninstall 的 data */
export interface MarketUninstallResult {
    slug: string;
}

/** POST /api/open 的 data */
export interface OpenResult {
    kind: "url" | "path";
    value: string;
}
