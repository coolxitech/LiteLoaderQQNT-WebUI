// 全站通用的小工具：类名合并、剪贴板。
// 这里只放与 UI 框架无关的纯函数，方便任何组件直接 import。
import { clsx } from "clsx";

/**
 * 合并类名：过滤掉 false / null / undefined，其余按顺序拼接。
 * 用法：cn("card", isActive && "is-active", props.class)
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
    return clsx(parts);
}

/**
 * 复制文本到剪贴板：优先用异步剪贴板 API，失败时回退到 textarea + execCommand。
 * 返回是否复制成功，调用方据此决定提示文案。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    // 1. 异步剪贴板 API：需要安全上下文（https / http://localhost / Electron）
    try {
        if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    }
    catch {
        // 权限被拒或非安全上下文，继续走兜底方案
    }

    // 2. 兜底方案：临时 textarea 选中后执行 copy 命令
    try {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.top = "-9999px";
        area.style.left = "-9999px";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        area.setSelectionRange(0, area.value.length);
        const copied = document.execCommand("copy");
        document.body.removeChild(area);
        return copied;
    }
    catch {
        return false;
    }
}
