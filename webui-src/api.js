// token 握手与 fetch 封装。地址栏里的 token 只用于首次握手，随后存进 sessionStorage 并从地址栏移除
const TOKEN_KEY = "webui-token";

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

export const TOKEN = (() => {
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

export const has_token = TOKEN !== "";

export async function request(path, options = {}) {
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
