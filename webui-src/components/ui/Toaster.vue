<script setup lang="ts">
// Toast 容器：从 useToast() 读数据，自动关闭的定时器全部在这里统一调度，
// 鼠标悬停或焦点进入时暂停计时，离开后按剩余时间续跑。
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { Component } from "vue";
import { CircleCheckBig, CircleX, Info, TriangleAlert, X } from "lucide-vue-next";
import { getToastTimeout, useToast } from "./useToast";
import type { ToastTone } from "./useToast";

/** 恢复计时时至少再留一小段展示时间，避免暂停期间已到点的 toast 在鼠标离开时瞬间消失 */
const RESUME_MIN_DELAY = 320;

interface TimerEntry {
    handle: ReturnType<typeof setTimeout> | null;
    /** 剩余时间，单位毫秒 */
    remaining: number;
    /** 本轮计时开始的时间戳，单位毫秒 */
    started_at: number;
}

const { toasts, dismissToast } = useToast();

const timers = new Map<number, TimerEntry>();
const hovering = ref(false);
const focus_within = ref(false);
const paused = computed(() => hovering.value || focus_within.value);

const tone_icons: Record<ToastTone, Component> = {
    info: Info,
    ok: CircleCheckBig,
    warn: TriangleAlert,
    danger: CircleX
};

// 起一轮计时：记录剩余时间与起点，到点后先删表再关闭
function runTimer(id: number, delay: number): void {
    const entry = timers.get(id);
    if (!entry) return;
    entry.remaining = delay;
    entry.started_at = Date.now();
    entry.handle = setTimeout(() => {
        timers.delete(id);
        dismissToast(id);
    }, delay);
}

// 停表并把已消耗的时间从剩余时间里扣掉
function stopTimer(entry: TimerEntry): void {
    if (entry.handle === null) return;
    clearTimeout(entry.handle);
    entry.handle = null;
    entry.remaining = Math.max(entry.remaining - (Date.now() - entry.started_at), 0);
}

function forgetTimer(id: number): void {
    const entry = timers.get(id);
    if (!entry) return;
    if (entry.handle !== null) clearTimeout(entry.handle);
    timers.delete(id);
}

function pauseAll(): void {
    for (const entry of timers.values()) stopTimer(entry);
}

function resumeAll(): void {
    for (const [id, entry] of timers) {
        if (entry.handle === null) runTimer(id, Math.max(entry.remaining, RESUME_MIN_DELAY));
    }
}

// 新增的 toast 按各自 timeout 起表；timeout 为 0 的常驻不动
watch(
    toasts,
    (list) => {
        const alive = new Set(list.map((item) => item.id));
        for (const id of Array.from(timers.keys())) {
            if (!alive.has(id)) forgetTimer(id);
        }
        for (const item of list) {
            if (timers.has(item.id)) continue;
            const duration = getToastTimeout(item.id);
            if (duration <= 0) continue;
            timers.set(item.id, { handle: null, remaining: duration, started_at: 0 });
            if (!paused.value) runTimer(item.id, duration);
        }
    },
    { deep: true, immediate: true }
);

// 暂停 / 恢复：悬停与焦点任一存在都算暂停
watch(paused, (value) => {
    if (value) pauseAll();
    else resumeAll();
});

onBeforeUnmount(() => {
    for (const entry of timers.values()) {
        if (entry.handle !== null) clearTimeout(entry.handle);
    }
    timers.clear();
});
</script>

<template>
    <!-- 容器只做播报，不抢焦点；pointer-events 交给单条 toast 打开 -->
    <div
        class="ui-toaster"
        role="status"
        aria-live="polite"
        aria-atomic="false"
        @pointerenter="hovering = true"
        @pointerleave="hovering = false"
        @focusin="focus_within = true"
        @focusout="focus_within = false"
    >
        <TransitionGroup name="ui-toast">
            <div v-for="toast in toasts" :key="toast.id" class="ui-toast" :class="'is-' + toast.tone">
                <component :is="tone_icons[toast.tone]" class="ui-toast-icon" :size="16" aria-hidden="true" />
                <div class="ui-toast-copy">
                    <p class="ui-toast-title">{{ toast.title }}</p>
                    <p v-if="toast.description" class="ui-toast-desc">{{ toast.description }}</p>
                </div>
                <button type="button" class="ui-toast-close" aria-label="关闭通知" @click="dismissToast(toast.id)">
                    <X :size="14" aria-hidden="true" />
                </button>
            </div>
        </TransitionGroup>
    </div>
</template>

<style scoped>
.ui-toaster {
    position: fixed;
    right: var(--sp-9);
    bottom: var(--sp-9);
    z-index: var(--z-toast);
    display: flex;
    flex-direction: column-reverse;
    gap: var(--sp-4);
    width: min(360px, calc(100vw - 32px));
    pointer-events: none;
}

.ui-toast {
    display: flex;
    gap: var(--sp-5);
    align-items: flex-start;
    padding: var(--sp-6) var(--sp-7);
    border: 1px solid var(--line-strong);
    border-left: 2px solid var(--line-strong);
    border-radius: var(--r-md);
    background: var(--surface-2);
    box-shadow: var(--elev-3);
    pointer-events: auto;
}

.ui-toast.is-info {
    border-left-color: var(--info);
}

.ui-toast.is-ok {
    border-left-color: var(--accent);
}

.ui-toast.is-warn {
    border-left-color: var(--warn);
}

.ui-toast.is-danger {
    border-left-color: var(--danger);
}

.ui-toast-icon {
    flex-shrink: 0;
    margin-top: 1px;
}

.ui-toast.is-info .ui-toast-icon {
    color: var(--info);
}

.ui-toast.is-ok .ui-toast-icon {
    color: var(--accent);
}

.ui-toast.is-warn .ui-toast-icon {
    color: var(--warn);
}

.ui-toast.is-danger .ui-toast-icon {
    color: var(--danger);
}

.ui-toast-copy {
    flex: 1;
    min-width: 0;
}

.ui-toast-title {
    color: var(--fg);
    font-size: var(--text-sm);
    font-weight: 600;
    overflow-wrap: anywhere;
}

.ui-toast-desc {
    margin-top: var(--sp-1);
    color: var(--fg-muted);
    font-size: var(--text-xs);
    overflow-wrap: anywhere;
}

/* 关闭按钮：28×28 ghost，图标保持 14px */
.ui-toast-close {
    display: grid;
    flex-shrink: 0;
    place-items: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--r-xs);
    background: transparent;
    color: var(--fg-subtle);
    cursor: pointer;
    transition: background var(--dur-1) var(--ease-out), border-color var(--dur-1) var(--ease-out), color var(--dur-1) var(--ease-out);
}

.ui-toast-close:hover {
    border-color: var(--line);
    background: var(--surface-3);
    color: var(--fg);
}

.ui-toast-close:active {
    background: var(--surface-1);
}

.ui-toast-close:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
}

/* 入场用 animate.css 的 slideInRight，退场用 fadeOut（更快更干脆）；移动用 transition 保持列表顺滑 */
.ui-toast-enter-active {
    animation: slideInRight var(--dur-2) var(--motion-ease) both;
}

.ui-toast-leave-active {
    animation: fadeOut 140ms var(--ease-in) both;
}

.ui-toast-enter-from,
.ui-toast-leave-to {
    opacity: 0;
}

.ui-toast-move {
    transition: transform var(--dur-3) var(--ease-out);
}

/* 窄屏贴满左右两边，并让出底部导航的高度与安全区 */
@media (max-width: 720px) {
    .ui-toaster {
        right: var(--sp-6);
        bottom: 16px;
        left: var(--sp-6);
        width: auto;
    }
}

.ui-toast { background:var(--glass-surface); backdrop-filter:blur(14px); border-radius:8px; }

</style>
