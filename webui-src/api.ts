// token 握手与 fetch 封装。地址栏里的 token 只用于首次握手，随后存进 sessionStorage 并从地址栏移除
import type { ApiResponse } from "./types";

const TOKEN_KEY = "webui-token";

/** 取错误的可读信息：抛出的可能不是 Error（字符串、带 message 的对象） */
export function errorText(caught: unknown): string {
    if (caught instanceof Error) return caught.message;
    if (caught !== null && typeof caught === "object" && "message" in caught) {
        const message = (caught as { message?: unknown }).message;
        if (typeof message === "string") return message;
    }
    return String(caught);
}

function stripTokenFromUrl(): void {
    try {
        const params = new URLSearchParams(window.location.search);
        params.delete("token");
        const search = params.toString();
        const next = window.location.pathname + (search === "" ? "" : "?" + search) + window.location.hash;
        window.history.replaceState(null, "", next);
    }
    catch { /* 替换失败不影响功能，只是地址栏留着 token */ }
}

function readTokenFromUrl(): string {
    try { return new URLSearchParams(window.location.search).get("token") ?? ""; }
    catch { return ""; }
}

export const TOKEN: string = (() => {
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

export const has_token: boolean = TOKEN !== "";

export interface RequestOptions {
    method?: string;
    body?: unknown;
}

/**
 * 统一请求入口：成功返回响应包里的 data，失败抛 Error（message 取后端给的提示）。
 * 后端所有 /api/* 成功分支都会带 data，所以这里按 T 直接取用。
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { "X-WebUI-Token": TOKEN };
    const init: RequestInit = {
        method: options.method ?? "GET",
        headers,
        cache: "no-store"
    };
    if (options.body !== undefined) {
        headers["content-type"] = "application/json";
        init.body = JSON.stringify(options.body);
    }
    let response: Response;
    try { response = await fetch(path, init); }
    catch (caught) { throw new Error("无法连接 WebUI 服务：" + errorText(caught)); }
    let payload: ApiResponse<T> | null = null;
    try { payload = await response.json() as ApiResponse<T>; }
    catch { payload = null; }
    if (!response.ok || !payload || payload.ok !== true) {
        throw new Error(payload?.message ?? "请求失败：HTTP " + response.status);
    }
    return payload.data;
}
