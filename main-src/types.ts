// LiteLoader 全局对象的最小类型建模。
// 只声明本插件真正用到的字段：完整类型要么依赖 LiteLoader 本体、要么依赖 electron，
// 而引入 electron 会额外下载上百 MB 的二进制，所以这里用结构化类型描述运行时契约。
// 清单字段（name / version / type …）来自第三方 manifest.json，无法保证类型，
// 因此这类值统一用 unknown，由使用处按需收窄，避免用 any 把检查关掉。

export interface LiteLoaderVersions {
    liteloader?: string;
    qqnt?: string;
    electron?: string;
    node?: string;
    chrome?: string;
    [key: string]: string | undefined;
}

export interface LiteLoaderPath {
    root?: string | null;
    profile?: string | null;
    data?: string | null;
    plugins?: string | null;
}

/** 插件清单：字段来自第三方 manifest.json，只声明已知键 */
export interface PluginManifest {
    slug?: unknown;
    name?: unknown;
    version?: unknown;
    type?: unknown;
    description?: unknown;
    icon?: unknown;
    authors?: unknown;
    [key: string]: unknown;
}

/** LiteLoader.plugins 里的一项（插件实例） */
export interface PluginInstance {
    manifest?: PluginManifest | null;
    incompatible?: unknown;
    disabled?: unknown;
}

/** api.plugin.market.installed() 返回数组里的单项 */
export interface MarketInstalledItem {
    slug?: unknown;
    version?: unknown;
}

/** api.plugin.market.list() 返回数组里的单项 */
export interface MarketEntry {
    repo?: unknown;
    branch?: unknown;
    manifest?: PluginManifest | null;
    error?: unknown;
}

export interface MarketApi {
    installed?: () => Promise<unknown>;
    list?: (refresh: boolean) => Promise<unknown>;
    install?: (slug: string, url: string) => Promise<unknown>;
    uninstall?: (slug: string, removeData: boolean) => Promise<unknown>;
}

export interface UpdateApi {
    check?: (refresh: boolean) => Promise<unknown>;
}

export interface ConfigApi {
    get: (key: string, fallback?: Record<string, unknown>) => unknown;
    set: (key: string, value: unknown) => void;
}

export interface PluginApi {
    disable: (slug: string, enabled: boolean) => void;
    delete: (slug: string, flags: boolean[], now: boolean) => void;
    market?: MarketApi;
}

export interface LiteLoaderApi {
    config: ConfigApi;
    plugin: PluginApi;
    update?: UpdateApi;
    // 这两个方法由 LiteLoader 本体无条件提供；缺少时调用会抛错并被 API 统一错误处理成 500，
    // 与旧版 JS 行为一致，所以这里声明为必选而不是可选
    openExternal: (url: string) => void;
    openPath: (target: string) => void;
}

export interface LiteLoader {
    versions?: LiteLoaderVersions;
    path?: LiteLoaderPath;
    plugins?: Record<string, PluginInstance | null>;
    api: LiteLoaderApi;
}

/** /api/plugins 的单项：name / version / type 直接透传清单原值 */
export interface PluginSummary {
    slug: string;
    name: unknown;
    version: unknown;
    type: unknown;
    enabled: boolean;
    loaded: boolean;
    incompatible: boolean;
}

/** 市场 / 更新 API 的统一返回：{ success, message, ... } */
export interface MarketCallResult {
    success?: unknown;
    message?: unknown;
    [key: string]: unknown;
}
