<script setup lang="ts">
// 通用对话框：焦点陷阱、Esc 关闭、点遮罩关闭、aria-labelledby 全部交给 reka 处理，这里只做视觉
import { X } from "lucide-vue-next";
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from "reka-ui";

type DialogSize = "sm" | "md";

withDefaults(defineProps<{
    open: boolean;
    title: string;
    description?: string;
    size?: DialogSize;
}>(), {
    size: "sm"
});

const emit = defineEmits<{ "update:open": [value: boolean] }>();

// reka 的 DialogRoot 通过 update:open 回传状态，这里原样转发给父组件的 v-model:open
function handleOpenChange(value: boolean): void {
    emit("update:open", value);
}
</script>

<template>
    <DialogRoot :open="open" @update:open="handleOpenChange">
        <DialogPortal>
            <DialogOverlay class="ui-dialog-overlay" />
            <DialogContent class="ui-dialog" :class="{ 'is-md': size === 'md' }">
                <DialogTitle class="ui-dialog-title">{{ title }}</DialogTitle>
                <!-- description 为空时不渲染节点，避免出现空的段落 -->
                <DialogDescription v-if="description" class="ui-dialog-desc">{{ description }}</DialogDescription>
                <div class="ui-dialog-body">
                    <slot />
                </div>
                <div v-if="$slots.footer" class="ui-dialog-footer">
                    <slot name="footer" />
                </div>
                <DialogClose class="ui-dialog-close" aria-label="关闭">
                    <X :size="16" aria-hidden="true" />
                </DialogClose>
            </DialogContent>
        </DialogPortal>
    </DialogRoot>
</template>

<style scoped>
/* 遮罩：压暗背景并轻微模糊，突出对话框本体 */
.ui-dialog-overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-overlay);
    background: var(--scrim);
}

/* 遮罩用 animate.css 的 fadeIn / fadeOut（keyframes 来自 main.ts 里的全局 animate.css）。
   reka 的 Presence 看的是 animationend 且要求 event.target 就是这个节点，所以
   ① 必须是 animation 而不是 transition；② 动画只能挂在这两个根节点自己身上，不能挂内层容器。 */
.ui-dialog-overlay[data-state="open"] {
    animation: fadeIn var(--dur-1) var(--motion-ease);
}

.ui-dialog-overlay[data-state="closed"] {
    animation: fadeOut var(--dur-1) var(--ease-in);
}

/* 对话框本体：固定居中，超高时内部滚动。
   居中不用 transform 位移：入场 / 退场是 animate.css 的 zoomIn / zoomOut，它们的 keyframes 直接写
   transform: scale3d(...)，会把 translate(-50%,-50%) 整个盖掉，弹窗在动画期间会跳到右下角。
   inset:0 + margin:auto 用外边距居中，与 transform 动画互不干扰。 */
.ui-dialog {
    position: fixed;
    inset: 0;
    margin: auto;
    z-index: var(--z-dialog);
    display: flex;
    flex-direction: column;
    gap: var(--sp-7);
    width: calc(100vw - 32px);
    max-width: 460px;
    max-height: calc(100vh - 64px);
    padding: var(--sp-10);
    overflow-y: auto;
    border: 1px solid var(--line-strong);
    border-radius: var(--r-lg);
    background: var(--surface-1);
    box-shadow: var(--elev-3);
}

.ui-dialog.is-md {
    max-width: 560px;
}

/* 标题右侧留出关闭按钮的位置，长标题不会压到按钮下面 */
.ui-dialog-title {
    padding-right: var(--sp-12);
    color: var(--fg);
    font-size: var(--text-lg);
    font-weight: 600;
}

.ui-dialog-desc {
    color: var(--fg-muted);
    font-size: var(--text-sm);
    line-height: var(--leading-snug);
}

.ui-dialog-body {
    min-width: 0;
}

.ui-dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--sp-4);
    margin-top: var(--sp-2);
}

/* 右上角关闭按钮：ghost 视觉，hover / active / 焦点环齐全 */
.ui-dialog-close {
    position: absolute;
    top: var(--sp-6);
    right: var(--sp-6);
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--r-xs);
    background: transparent;
    color: var(--fg-subtle);
    cursor: pointer;
    transition: background var(--dur-1) var(--ease-out), border-color var(--dur-1) var(--ease-out), color var(--dur-1) var(--ease-out);
}

.ui-dialog-close:hover {
    border-color: var(--line);
    background: var(--surface-2);
    color: var(--fg);
}

.ui-dialog-close:active {
    background: var(--surface-3);
}

.ui-dialog-close:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
}

@keyframes ui-dialog-fade-in {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@keyframes ui-dialog-fade-out {
    from {
        opacity: 1;
    }

    to {
        opacity: 0;
    }
}


.ui-dialog { border-radius:12px; background:linear-gradient(145deg,var(--surface-1),var(--surface-2)); }
.ui-dialog-overlay { backdrop-filter:blur(4px); }


.ui-dialog { border-radius:14px; box-shadow:var(--elev-3); }
.ui-dialog-overlay[data-state="open"] { animation:fadeIn 200ms var(--motion-ease); }
.ui-dialog-overlay[data-state="closed"] { animation:fadeOut 160ms ease-out; }
.ui-dialog[data-state="open"] { animation:dialog-soft-in 280ms var(--motion-ease); }
.ui-dialog[data-state="closed"] { animation:dialog-soft-out 160ms ease-out; }
@keyframes dialog-soft-in { from { opacity:0; transform:translate(-50%,-50%) scale(.97); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
@keyframes dialog-soft-out { from { opacity:1; transform:translate(-50%,-50%) scale(1); } to { opacity:0; transform:translate(-50%,-50%) scale(.985); } }
@media(prefers-reduced-motion:reduce) { .ui-dialog,.ui-dialog-overlay { animation:none !important; } }

</style>
