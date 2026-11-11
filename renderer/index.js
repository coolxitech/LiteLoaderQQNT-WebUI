// QQ 渲染进程注入脚本（ESM）。只负责在插件设置页里显示 WebUI 地址与打开按钮。
const PLUGIN_SLUG = "webui";
const DEFAULT_PORT = 3210;

function getApi() {
    try { return globalThis.LiteLoader?.api ?? null; }
    catch { return null; }
}

function buildUrl(config) {
    const port = Number.isInteger(Number(config?.port)) && Number(config.port) > 0 && Number(config.port) < 65536
        ? Number(config.port)
        : DEFAULT_PORT;
    const token = typeof config?.token === "string" ? config.token : "";
    return `http://127.0.0.1:${port}/?token=${encodeURIComponent(token)}`;
}

function createText(text, secondary) {
    const element = document.createElement("setting-text");
    if (secondary) element.setAttribute("data-type", "secondary");
    element.textContent = text;
    return element;
}

/**
 * LiteLoader 在插件设置页创建完成时调用，view 是该插件的容器元素
 */
export function onSettingWindowCreated(view) {
    if (!view) return;

    const section = document.createElement("setting-section");
    section.setAttribute("data-title", "WebUI");

    const panel = document.createElement("setting-panel");
    const list = document.createElement("setting-list");
    const item = document.createElement("setting-item");
    item.setAttribute("data-direction", "row");

    const info = document.createElement("div");
    info.appendChild(createText("WebUI 地址"));
    const address_text = createText("正在读取配置…", true);
    info.appendChild(address_text);

    const open_button = document.createElement("setting-button");
    open_button.setAttribute("data-type", "secondary");
    open_button.textContent = "打开";
    open_button.setAttribute("is-disabled", "");

    item.appendChild(info);
    item.appendChild(open_button);
    list.appendChild(item);
    panel.appendChild(list);
    section.appendChild(panel);

    const hint = document.createElement("setting-item");
    hint.setAttribute("data-direction", "row");
    hint.appendChild(createText("仅监听 127.0.0.1，必须带 token 访问；地址栏 token 会保存在浏览器 sessionStorage。", true));
    panel.appendChild(hint);

    view.appendChild(section);

    let current_url = "";

    const apply = (config) => {
        const enabled = config?.enabled !== false;
        const token = typeof config?.token === "string" ? config.token : "";
        if (!enabled || !token) {
            address_text.textContent = "WebUI 未启用：请在 data/webui/config.json 中开启 enabled 并重启 QQ";
            open_button.setAttribute("is-disabled", "");
            current_url = "";
            return;
        }
        current_url = buildUrl(config);
        address_text.textContent = current_url;
        open_button.removeAttribute("is-disabled");
    };

    const api = getApi();
    if (!api?.config?.get) {
        address_text.textContent = "当前 LiteLoader 版本不支持 config API，无法读取 WebUI 配置";
        return;
    }

    api.config.get(PLUGIN_SLUG, {})
        .then((config) => apply(config ?? {}))
        .catch(() => {
            address_text.textContent = "读取 WebUI 配置失败，请查看主进程日志";
            open_button.setAttribute("is-disabled", "");
        });

    open_button.addEventListener("click", () => {
        if (!current_url) return;
        const opener = getApi()?.openExternal;
        if (typeof opener === "function") {
            opener(current_url);
            return;
        }
        window.open(current_url, "_blank", "noopener,noreferrer");
    });
}
