// WebUI 主进程实现（CommonJS）。编译产物 main/index.js 由 manifest.json 的 injects.main 加载。
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import type {
    LiteLoader,
    MarketApi,
    MarketCallResult,
    MarketInstalledItem,
    PluginInstance,
    PluginManifest,
    PluginSummary
} from "./types";

// 插件自身标识，同时作为 LiteLoader 配置与数据目录名
const SLUG = "webui";
const DEFAULT_CONFIG = { enabled: true, port: 3210, token: "" };
// 静态资源根：本文件位于 <plugin>/main/index.js，静态页在 <plugin>/webui
const STATIC_ROOT = path.join(__dirname, "..", "webui");
const INDEX_FILE = path.join(STATIC_ROOT, "index.html");
const MAX_BODY_SIZE = 1024 * 1024;
const DEFAULT_LITELOADER_CONFIG: Record<string, unknown> = {
    enable_plugins: true,
    disabled_plugins: [],
    deleting_plugins: {}
};

/** 本插件自身的配置项（data/webui/config.json） */
interface WebUIConfig {
    enabled: boolean;
    port: number;
    token: string;
}

/** 每个 HTTP 服务实例共享的上下文 */
interface ServerContext {
    port: number;
    token: string;
}

const MIME_TYPES: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".map": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8"
};

function log(...args: unknown[]): void {
    try { console.log("[WebUI]", ...args); }
    catch { /* 日志失败不影响主流程 */ }
}

/** 取错误的可读信息：抛出的可能不是 Error（字符串、带 status 的对象） */
function describeError(error: unknown): unknown {
    if (error !== null && typeof error === "object" && "message" in error) {
        const message = (error as { message?: unknown }).message;
        if (message !== undefined) return message;
    }
    return error;
}

/** 取错误里的 HTTP 状态码，非法值一律回落到 500 */
function errorStatus(error: unknown): number {
    if (error !== null && typeof error === "object" && "status" in error) {
        const status = (error as { status?: unknown }).status;
        if (typeof status === "number" && Number.isInteger(status)) return status;
    }
    return 500;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

// LiteLoader 是受保护的 getter：调用栈不在本体/插件目录内时会返回 null
function getLiteLoader(): LiteLoader | null {
    try {
        // globalThis 上没有 LiteLoader 的声明，这里用断言描述运行时的真实形状
        const scope = globalThis as { LiteLoader?: LiteLoader | null };
        return scope.LiteLoader ?? null;
    }
    catch { return null; }
}

function normalizePort(value: unknown): number {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return DEFAULT_CONFIG.port;
    return port;
}

function writeTokenFile(lite: LiteLoader, token: string): void {
    try {
        const data_root = lite?.path?.data;
        if (!data_root) return;
        const token_path = path.join(data_root, SLUG, "token");
        fs.mkdirSync(path.dirname(token_path), { recursive: true });
        fs.writeFileSync(token_path, token, "utf-8");
    }
    catch (error) { log("写入 token 文件失败：", describeError(error)); }
}

// 读取插件配置：缺失 token 时生成并回写，保证每次启动 token 稳定
function loadConfig(lite: LiteLoader): WebUIConfig {
    let stored: unknown = null;
    try { stored = lite.api.config.get(SLUG, { ...DEFAULT_CONFIG }); }
    catch (error) { log("读取配置失败，使用默认值：", describeError(error)); }
    // 存下来的值来自用户手改的 JSON，先当未知值收窄再取值，避免把脏数据当数字用
    const raw: Record<string, unknown> = { ...DEFAULT_CONFIG, ...(isRecord(stored) ? stored : {}) };
    const config: WebUIConfig = {
        enabled: raw.enabled !== false,
        port: normalizePort(raw.port),
        token: typeof raw.token === "string" ? raw.token : ""
    };
    let dirty = false;
    if (config.token === "") {
        config.token = crypto.randomBytes(24).toString("hex");
        dirty = true;
    }
    if (dirty) {
        try { lite.api.config.set(SLUG, config); }
        catch (error) { log("回写配置失败：", describeError(error)); }
    }
    writeTokenFile(lite, config.token);
    return config;
}

function isInsideDirectory(parent: string, child: string): boolean {
    const relative = path.relative(parent, child);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

// 只接受 127.0.0.1 / localhost 加当前端口，抵御 DNS rebinding
function isAllowedHost(host: string | undefined, port: number): boolean {
    if (typeof host !== "string" || host === "") return false;
    const value = host.trim().toLowerCase();
    return value === `127.0.0.1:${port}` || value === `localhost:${port}`;
}

// 带 Origin 的请求必须是同源，否则视为跨站调用
function isAllowedOrigin(origin: string | undefined, port: number): boolean {
    if (origin === undefined || origin === null || origin === "") return true;
    const value = String(origin).trim().toLowerCase();
    if (value === "null") return false;
    return value === `http://127.0.0.1:${port}` || value === `http://localhost:${port}`;
}

function checkToken(provided: unknown, expected: string): boolean {
    if (typeof provided !== "string" || provided === "") return false;
    if (typeof expected !== "string" || expected === "") return false;
    const provided_buffer = Buffer.from(provided, "utf-8");
    const expected_buffer = Buffer.from(expected, "utf-8");
    if (provided_buffer.length !== expected_buffer.length) return false;
    try { return crypto.timingSafeEqual(provided_buffer, expected_buffer); }
    catch { return false; }
}

function sendJson(response: http.ServerResponse, status: number, payload: unknown): void {
    if (response.writableEnded || response.headersSent) {
        try { response.end(); } catch { /* 已结束 */ }
        return;
    }
    const body = Buffer.from(JSON.stringify(payload), "utf-8");
    response.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "content-length": body.length,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
    });
    response.end(body);
}

function sendText(response: http.ServerResponse, status: number, text: string): void {
    if (response.writableEnded || response.headersSent) {
        try { response.end(); } catch { /* 已结束 */ }
        return;
    }
    const body = Buffer.from(text, "utf-8");
    response.writeHead(status, {
        "content-type": "text/plain; charset=utf-8",
        "content-length": body.length,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
    });
    response.end(body);
}

function statFile(target: string): fs.Stats | null {
    try { return fs.statSync(target); }
    catch { return null; }
}

// 判断原始请求路径里是否有穿越片段。
// 必须用 request.url 原文判断：new URL() 会先把 /../ 规范化掉，规范化后就看不出来了
function hasTraversal(request_path: unknown): boolean {
    let decoded: string;
    try { decoded = decodeURIComponent(String(request_path ?? "")); }
    catch { return true; }
    if (decoded.includes("\0")) return true;
    return decoded.split(/[\\/]+/).includes("..");
}

// 把 URL 路径映射到静态目录内的真实文件；出现穿越或落到目录外一律返回 null
function resolveStaticPath(request_path: string): string | null {
    let decoded: string;
    try { decoded = decodeURIComponent(request_path); }
    catch { return null; }
    if (decoded.includes("\0")) return null;
    const segments = decoded.split(/[\\/]+/);
    if (segments.some((segment) => segment === "..")) return null;
    const relative = decoded.replace(/^[\\/]+/, "");
    const target = path.resolve(STATIC_ROOT, relative);
    if (target !== STATIC_ROOT && !isInsideDirectory(STATIC_ROOT, target)) return null;
    return target;
}

function readBody(request: http.IncomingMessage): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        let size = 0;
        let settled = false;
        request.on("data", (chunk: Buffer) => {
            if (settled) return;
            size += chunk.length;
            if (size > MAX_BODY_SIZE) {
                settled = true;
                chunks.length = 0;
                reject(Object.assign(new Error("请求体超过 1MB 上限"), { status: 413 }));
                return;
            }
            chunks.push(chunk);
        });
        request.on("end", () => {
            if (settled) return;
            settled = true;
            resolve(Buffer.concat(chunks));
        });
        request.on("error", (error: Error) => {
            if (settled) return;
            settled = true;
            reject(error);
        });
    });
}

async function readJsonBody(request: http.IncomingMessage): Promise<unknown> {
    const buffer = await readBody(request);
    if (buffer.length === 0) return null;
    try { return JSON.parse(buffer.toString("utf-8")); }
    catch { throw Object.assign(new Error("请求体不是合法 JSON"), { status: 400 }); }
}

function isTruthyFlag(value: unknown): boolean {
    return value === "1" || value === "true" || value === "yes";
}

// 扫描插件目录，得到 slug -> manifest 映射（未加载/已禁用的插件也能拿到名称）
function scanManifests(plugins_dir: string | null | undefined): Map<string, PluginManifest> {
    const map = new Map<string, PluginManifest>();
    if (!plugins_dir) return map;
    let dirents: fs.Dirent[] = [];
    try { dirents = fs.readdirSync(plugins_dir, { withFileTypes: true }); }
    catch { return map; }
    for (const dirent of dirents) {
        const manifest_path = path.join(plugins_dir, dirent.name, "manifest.json");
        try {
            const manifest: unknown = JSON.parse(fs.readFileSync(manifest_path, "utf-8"));
            if (isRecord(manifest) && typeof manifest.slug === "string" && !map.has(manifest.slug)) {
                map.set(manifest.slug, manifest as PluginManifest);
            }
        }
        catch { continue; }
    }
    return map;
}

function getDisabledSlugs(lite: LiteLoader): Set<string> {
    try {
        const config = lite.api.config.get("LiteLoader", { ...DEFAULT_LITELOADER_CONFIG });
        const list = isRecord(config) && Array.isArray(config.disabled_plugins) ? config.disabled_plugins : [];
        return new Set(list.filter((item): item is string => typeof item === "string"));
    }
    catch { return new Set<string>(); }
}

async function safeInstalledList(market: MarketApi | undefined): Promise<MarketInstalledItem[]> {
    if (!market || typeof market.installed !== "function") return [];
    try {
        const result = await market.installed();
        return Array.isArray(result) ? result as MarketInstalledItem[] : [];
    }
    catch (error) {
        log("读取已安装插件失败：", describeError(error));
        return [];
    }
}

/** 合并中的插件条目 */
interface PluginEntry {
    slug: string;
    version: unknown;
    manifest: PluginManifest | null;
    instance: PluginInstance | null;
}

function buildPluginList(lite: LiteLoader, installed_list: MarketInstalledItem[]): PluginSummary[] {
    const disabled = getDisabledSlugs(lite);
    const manifests = scanManifests(lite?.path?.plugins);
    const entries = new Map<string, PluginEntry>();
    for (const item of installed_list) {
        const slug = item?.slug;
        if (typeof slug !== "string" || slug === "" || entries.has(slug)) continue;
        entries.set(slug, { slug, version: item?.version ?? null, manifest: null, instance: null });
    }
    for (const [slug, plugin] of Object.entries(lite?.plugins ?? {})) {
        const entry = entries.get(slug) ?? { slug, version: null, manifest: null, instance: null };
        entry.instance = plugin ?? null;
        entry.manifest = plugin?.manifest ?? null;
        entries.set(slug, entry);
    }
    const plugins: PluginSummary[] = [];
    for (const entry of entries.values()) {
        const instance = entry.instance ?? lite?.plugins?.[entry.slug] ?? null;
        const manifest = entry.manifest ?? manifests.get(entry.slug) ?? null;
        plugins.push({
            slug: entry.slug,
            name: manifest?.name ?? entry.slug,
            version: manifest?.version ?? entry.version ?? null,
            type: manifest?.type ?? "extension",
            enabled: !disabled.has(entry.slug),
            loaded: Boolean(instance),
            incompatible: Boolean(instance?.incompatible)
        });
    }
    plugins.sort((left, right) => left.slug.localeCompare(right.slug));
    return plugins;
}

async function handleApi(
    context: ServerContext,
    request: http.IncomingMessage,
    response: http.ServerResponse,
    url: URL
): Promise<void> {
    const token = request.headers["x-webui-token"];
    if (!checkToken(Array.isArray(token) ? token[0] : token, context.token)) {
        return sendJson(response, 401, { ok: false, message: "缺少或错误的 X-WebUI-Token" });
    }

    const method = (request.method ?? "GET").toUpperCase();
    const raw_path = url.pathname;
    const route = raw_path.length > 1 ? raw_path.replace(/\/+$/, "") : raw_path;

    const lite = getLiteLoader();
    if (!lite) {
        return sendJson(response, 503, { ok: false, message: "无法访问 LiteLoader 全局对象" });
    }

    try {
        if (route === "/api/status" && method === "GET") {
            const installed_list = await safeInstalledList(lite.api?.plugin?.market);
            return sendJson(response, 200, {
                ok: true,
                data: {
                    versions: lite.versions ?? {},
                    path: {
                        root: lite.path?.root ?? null,
                        profile: lite.path?.profile ?? null,
                        data: lite.path?.data ?? null,
                        plugins: lite.path?.plugins ?? null
                    },
                    loaded: Object.keys(lite.plugins ?? {}).length,
                    installed: installed_list.length
                }
            });
        }

        if (route === "/api/plugins" && method === "GET") {
            const installed_list = await safeInstalledList(lite.api?.plugin?.market);
            return sendJson(response, 200, { ok: true, data: buildPluginList(lite, installed_list) });
        }

        const action_match = /^\/api\/plugins\/([^/]+)\/(enable|delete)$/.exec(route);
        if (action_match && method === "POST") {
            let slug: string;
            try { slug = decodeURIComponent(action_match[1]); }
            catch { return sendJson(response, 400, { ok: false, message: "插件 slug 不合法" }); }
            if (!slug) return sendJson(response, 400, { ok: false, message: "插件 slug 不合法" });

            if (action_match[2] === "enable") {
                const body = await readJsonBody(request);
                if (!isRecord(body) || typeof body.enabled !== "boolean") {
                    return sendJson(response, 400, { ok: false, message: "enabled 必须是布尔值" });
                }
                lite.api.plugin.disable(slug, body.enabled);
                return sendJson(response, 200, { ok: true, data: { slug, enabled: body.enabled } });
            }

            const body = await readJsonBody(request);
            const record = isRecord(body) ? body : {};
            const self = Boolean(record.self);
            const data = Boolean(record.data);
            if (!self && !data) {
                return sendJson(response, 400, { ok: false, message: "请至少勾选插件本体或数据目录" });
            }
            // now = false：只写入 deleting_plugins，下次启动时真正删除
            lite.api.plugin.delete(slug, [self, data], false);
            return sendJson(response, 200, {
                ok: true,
                data: { slug, self, data, restart_required: true }
            });
        }

        if (route === "/api/market" && method === "GET") {
            const market = lite.api?.plugin?.market;
            if (!market || typeof market.list !== "function") {
                return sendJson(response, 501, { ok: false, message: "当前 LiteLoader 版本不支持插件市场 API" });
            }
            const result = await market.list(isTruthyFlag(url.searchParams.get("refresh"))) as MarketCallResult | null;
            if (result && result.success === false) {
                return sendJson(response, 502, { ok: false, message: result.message ?? "获取插件市场列表失败" });
            }
            return sendJson(response, 200, { ok: true, data: result });
        }

        if (route === "/api/market/install" && method === "POST") {
            const market = lite.api?.plugin?.market;
            if (!market || typeof market.install !== "function") {
                return sendJson(response, 501, { ok: false, message: "当前 LiteLoader 版本不支持插件市场 API" });
            }
            const body = await readJsonBody(request);
            const record = isRecord(body) ? body : {};
            const slug = typeof record.slug === "string" ? record.slug.trim() : "";
            const download_url = typeof record.url === "string" ? record.url.trim() : "";
            if (!slug) return sendJson(response, 400, { ok: false, message: "缺少插件 slug" });
            if (!download_url) return sendJson(response, 400, { ok: false, message: "缺少插件下载地址" });
            if (!/^https?:\/\//i.test(download_url)) {
                return sendJson(response, 400, { ok: false, message: "插件下载地址必须是 http(s) 链接" });
            }
            const result = await market.install(slug, download_url) as MarketCallResult | null;
            if (!result || result.success === false) {
                return sendJson(response, 400, { ok: false, message: result?.message ?? "安装插件失败" });
            }
            return sendJson(response, 200, { ok: true, data: { slug, restart_required: true } });
        }

        if (route === "/api/market/uninstall" && method === "POST") {
            const market = lite.api?.plugin?.market;
            if (!market || typeof market.uninstall !== "function") {
                return sendJson(response, 501, { ok: false, message: "当前 LiteLoader 版本不支持插件市场 API" });
            }
            const body = await readJsonBody(request);
            const record = isRecord(body) ? body : {};
            const slug = typeof record.slug === "string" ? record.slug.trim() : "";
            if (!slug) return sendJson(response, 400, { ok: false, message: "缺少插件 slug" });
            const result = await market.uninstall(slug, Boolean(record.removeData)) as MarketCallResult | null;
            if (!result || result.success === false) {
                return sendJson(response, 400, { ok: false, message: result?.message ?? "卸载插件失败" });
            }
            return sendJson(response, 200, { ok: true, data: { slug } });
        }

        if (route === "/api/update" && method === "GET") {
            const check = lite.api?.update?.check;
            if (typeof check !== "function") {
                return sendJson(response, 501, { ok: false, message: "当前 LiteLoader 版本不支持更新检查" });
            }
            const result = await check(isTruthyFlag(url.searchParams.get("refresh"))) as MarketCallResult | null;
            if (!result || result.success === false) {
                return sendJson(response, 502, { ok: false, message: result?.message ?? "检查更新失败" });
            }
            return sendJson(response, 200, { ok: true, data: result });
        }

        if (route === "/api/config") {
            if (method === "GET") {
                const config = lite.api.config.get("LiteLoader", { ...DEFAULT_LITELOADER_CONFIG });
                return sendJson(response, 200, { ok: true, data: config });
            }
            if (method === "PUT") {
                const body = await readJsonBody(request);
                if (!isRecord(body)) {
                    return sendJson(response, 400, { ok: false, message: "配置必须是 JSON 对象" });
                }
                lite.api.config.set("LiteLoader", body);
                return sendJson(response, 200, { ok: true, data: body });
            }
            return sendJson(response, 405, { ok: false, message: "只支持 GET 与 PUT" });
        }

        if (route === "/api/open" && method === "POST") {
            const body = await readJsonBody(request);
            const record = isRecord(body) ? body : {};
            const kind = record.kind;
            const value = typeof record.value === "string" ? record.value.trim() : "";
            if (!value) return sendJson(response, 400, { ok: false, message: "缺少要打开的地址" });
            if (kind === "url") {
                if (!/^https:\/\//i.test(value)) {
                    return sendJson(response, 400, { ok: false, message: "只允许打开 https 链接" });
                }
                lite.api.openExternal(value);
                return sendJson(response, 200, { ok: true, data: { kind, value } });
            }
            if (kind === "path") {
                const target = path.resolve(value);
                const roots = [lite.path?.plugins, lite.path?.data]
                    .filter((item): item is string => typeof item === "string" && item !== "")
                    .map((item) => path.resolve(item));
                if (!roots.some((root) => isInsideDirectory(root, target))) {
                    return sendJson(response, 403, { ok: false, message: "路径不在插件目录或数据目录内" });
                }
                lite.api.openPath(target);
                return sendJson(response, 200, { ok: true, data: { kind, value: target } });
            }
            return sendJson(response, 400, { ok: false, message: "kind 只能是 url 或 path" });
        }

        return sendJson(response, 404, { ok: false, message: `未知的 API 路径：${route}` });
    }
    catch (error) {
        const status = errorStatus(error);
        log(`API ${route} 处理失败：`, describeError(error));
        return sendJson(response, status, { ok: false, message: describeError(error) ?? "服务器内部错误" });
    }
}

function serveStatic(request: http.IncomingMessage, response: http.ServerResponse, url: URL): void {
    if (request.method !== "GET" && request.method !== "HEAD") {
        return sendText(response, 405, "静态资源只支持 GET");
    }
    const mapped = resolveStaticPath(url.pathname);
    if (!mapped) return sendText(response, 404, "Not Found");
    const mapped_info = statFile(mapped);
    // 目录与未知路径一律回落到 index.html，交给前端 hash 路由
    const target = mapped_info && mapped_info.isFile() ? mapped : INDEX_FILE;
    const target_info = statFile(target);
    if (!target_info || !target_info.isFile()) {
        return sendText(response, 404, "WebUI 静态资源缺失，请重新安装插件");
    }
    let content: Buffer;
    try { content = fs.readFileSync(target); }
    catch (error) {
        log("读取静态文件失败：", describeError(error));
        return sendText(response, 500, "读取静态文件失败");
    }
    const mime = MIME_TYPES[path.extname(target).toLowerCase()] ?? "application/octet-stream";
    response.writeHead(200, {
        "content-type": mime,
        "content-length": content.length,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
    });
    if (request.method === "HEAD") {
        response.end();
        return;
    }
    response.end(content);
}

async function handleRequest(
    context: ServerContext,
    request: http.IncomingMessage,
    response: http.ServerResponse
): Promise<void> {
    let url: URL;
    try { url = new URL(request.url ?? "/", `http://127.0.0.1:${context.port}`); }
    catch { return sendText(response, 400, "请求地址不合法"); }

    if (!isAllowedHost(request.headers.host, context.port)) {
        return sendText(response, 403, "Host 不被允许");
    }
    // 不返回任何 CORS 头，预检请求直接拒绝
    if (request.method === "OPTIONS") {
        return sendText(response, 403, "不支持跨域请求");
    }
    if (!isAllowedOrigin(request.headers.origin, context.port)) {
        return sendText(response, 403, "Origin 不被允许");
    }
    // 含 .. 的原始路径一律 404，不进入回落逻辑
    if (hasTraversal(String(request.url ?? "/").split("?")[0])) {
        return sendText(response, 404, "Not Found");
    }

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        return handleApi(context, request, response, url);
    }
    return serveStatic(request, response, url);
}

function createServer(context: ServerContext): http.Server {
    const server = http.createServer((request, response) => {
        handleRequest(context, request, response).catch((error: unknown) => {
            log("处理请求异常：", describeError(error));
            if (!response.headersSent) sendJson(response, 500, { ok: false, message: "服务器内部错误" });
            else { try { response.end(); } catch { /* 已结束 */ } }
        });
    });
    server.on("error", (error: NodeJS.ErrnoException) => {
        if (error?.code === "EADDRINUSE") {
            log(`端口 ${context.port} 已被占用，WebUI 未启动；请修改配置项 port 后重启 QQ`);
        }
        else if (error?.code === "EACCES") {
            log(`端口 ${context.port} 无权限监听，WebUI 未启动；请换一个大于 1024 的端口`);
        }
        else {
            log("HTTP 服务异常：", describeError(error));
        }
        try { server.close(); } catch { /* 未监听时 close 会抛错 */ }
    });
    return server;
}

// 退出时关掉监听；纯 Node 环境下 require("electron") 会抛错，必须容错
function bindQuitHook(server: http.Server): void {
    try {
        // 不装 electron 依赖（会下载上百 MB 二进制），只按需断言它存在的那部分形状
        const electron = require("electron") as { app?: { on?: (event: string, callback: () => void) => void } };
        if (electron && typeof electron.app?.on === "function") {
            electron.app.on("will-quit", () => { try { server.close(); } catch { /* 已关闭 */ } });
        }
    }
    catch { /* 不是 Electron 环境，忽略 */ }
}

function start(): { server: http.Server | null; url: string | null } {
    const lite = getLiteLoader();
    if (!lite) {
        log("未找到 LiteLoader 全局对象，WebUI 未启动");
        return { server: null, url: null };
    }
    let config: WebUIConfig;
    try { config = loadConfig(lite); }
    catch (error) {
        log("初始化配置失败，WebUI 未启动：", describeError(error));
        return { server: null, url: null };
    }
    if (!config.enabled) {
        log("配置项 enabled 为 false，WebUI 未启动");
        return { server: null, url: null };
    }
    const url = `http://127.0.0.1:${config.port}/?token=${config.token}`;
    const server = createServer({ port: config.port, token: config.token });
    server.listen(config.port, "127.0.0.1", () => {
        log(`已启动：${url}`);
    });
    bindQuitHook(server);
    return { server, url };
}

const instance = start();

// 与旧版一致：模块被 require 时就完成启动，并导出 server / url 供外部引用
export const server: http.Server | null = instance.server;
export const url: string | null = instance.url;
