// 全局 Toast 队列：模块级单例，任何组件调用 useToast() 拿到的都是同一份数据。
// 自动关闭的定时器统一由 Toaster.vue 调度（便于 hover / 聚焦时暂停），这里只负责数据本身。
import { ref } from "vue";
import type { Ref } from "vue";

export type ToastTone = "info" | "ok" | "warn" | "danger";

export interface ToastItem {
    id: number;
    tone: ToastTone;
    title: string;
    description?: string;
}

/** 临时通知最多保留的条数；常驻通知只能手动关闭 */
const MAX_TOASTS = 4;
/** 默认存活时长，单位毫秒 */
const DEFAULT_TIMEOUT = 4000;

const toasts = ref<ToastItem[]>([]);
/** 每条 toast 的存活时长：只给 Toaster.vue 取用，不进入对外契约 */
const toast_timeouts = new Map<number, number>();
let next_id = 0;

/**
 * 读取某条 toast 的存活时长（毫秒）。
 * Toaster.vue 用它决定 setTimeout 的延时；返回 0 表示常驻不自动关闭。
 */
export function getToastTimeout(id: number): number {
    return toast_timeouts.get(id) ?? DEFAULT_TIMEOUT;
}

export function useToast(): {
    toasts: Ref<ToastItem[]>;
    pushToast: (options: { tone?: ToastTone; title: string; description?: string; timeout?: number }) => number;
    dismissToast: (id: number) => void;
} {
    function pushToast(options: { tone?: ToastTone; title: string; description?: string; timeout?: number }): number {
        const timeout = options.timeout ?? DEFAULT_TIMEOUT;
        const tone = options.tone ?? "info";
        if (timeout <= 0) {
            const existing = toasts.value.find((item) => getToastTimeout(item.id) <= 0
                && item.tone === tone && item.title === options.title && item.description === options.description);
            if (existing) return existing.id;
        }
        next_id += 1;
        const id = next_id;
        toast_timeouts.set(id, timeout);
        toasts.value = [
            ...toasts.value,
            {
                id,
                tone: options.tone ?? "info",
                title: options.title,
                description: options.description
            }
        ];
        const temporary = toasts.value.filter((item) => getToastTimeout(item.id) > 0);
        const dropped = new Set(temporary.slice(0, Math.max(temporary.length - MAX_TOASTS, 0)).map((item) => item.id));
        if (dropped.size > 0) {
            toasts.value = toasts.value.filter((item) => !dropped.has(item.id));
            for (const dropped_id of dropped) toast_timeouts.delete(dropped_id);
        }
        return id;
    }

    function dismissToast(id: number): void {
        toasts.value = toasts.value.filter((item) => item.id !== id);
        toast_timeouts.delete(id);
    }

    return { toasts, pushToast, dismissToast };
}
