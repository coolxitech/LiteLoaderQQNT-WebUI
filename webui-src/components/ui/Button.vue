<script setup lang="ts">
// 按钮：四种语义变体；Inspira UI 的 shimmer 构型仅用于 primary，保留加载态、禁用态和 aria 语义
// shimmer 是三态而不是开关：一页里只允许一个「持续」光泽（焦点主操作），其余最多 hover 时才亮，
// 避免多张卡片的主按钮同时闪光、视觉权重被摊平。
import { computed } from "vue";
import InspiraShimmer from "@/components/effects/InspiraShimmer.vue";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const props = withDefaults(defineProps<{
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg" | "icon";
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
    type?: "button" | "submit";
    ariaLabel?: string;
    // "always" = 持续旋转（一页最多一处）；"hover" = 仅自身 hover / focus-visible 时播放；
    // true 是旧写法的兼容别名，等价于 "hover"（绝不能升级成持续动画，否则又变成“一群按钮同时闪光”）
    shimmer?: "always" | "hover" | boolean;
}>(), {
    variant: "secondary",
    size: "md",
    loading: false,
    disabled: false,
    block: false,
    type: "button",
    ariaLabel: undefined,
    shimmer: false,
});

const emit = defineEmits<{ click: [event: MouseEvent] }>();

// 变体只负责拼类名，真正的样式写在下方 scoped CSS 里
const button_variants = cva("ui-btn", {
    variants: {
        variant: {
            primary: "ui-btn--primary",
            secondary: "ui-btn--secondary",
            ghost: "ui-btn--ghost",
            danger: "ui-btn--danger",
        },
        size: {
            sm: "ui-btn--sm",
            md: "ui-btn--md",
            lg: "ui-btn--lg",
            icon: "ui-btn--icon",
        },
    },
    defaultVariants: {
        variant: "secondary",
        size: "md",
    },
});

const classes = computed(() => cn(
    button_variants({ variant: props.variant, size: props.size }),
    props.block && "ui-btn--block",
));

// 归一化三态：只有显式 "always" 才会持续旋转，true 一律降级成 "hover"，false / 未传则不渲染装饰层
const show_shimmer = computed(() => props.variant === "primary" && props.shimmer !== false);
const shimmer_mode = computed<"always" | "hover">(() => (props.shimmer === "always" ? "always" : "hover"));

function on_click(event: MouseEvent): void {
    // 禁用/加载中时原生 disabled 已拦住点击，这里再兜一层，防止代码派发的 click 穿透
    if (props.disabled || props.loading) return;
    emit("click", event);
}
</script>

<template>
    <button
        :class="classes"
        :type="type"
        :disabled="disabled || loading"
        :aria-label="ariaLabel"
        :aria-busy="loading ? 'true' : undefined"
        @click="on_click"
    >
        <InspiraShimmer v-if="show_shimmer" :mode="shimmer_mode" />
        <span v-if="loading" class="ui-btn-spinner" aria-hidden="true"></span>
        <span class="ui-btn-label"><slot /></span>
    </button>
</template>

<style scoped>
.ui-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; border:1px solid transparent; border-radius:4px; font-family:inherit; font-weight:500; line-height:1; white-space:nowrap; cursor:pointer; transition:background-color 150ms,border-color 150ms,color 150ms; }
.ui-btn--sm { min-height:32px; padding:0 12px; font-size:13px; }
.ui-btn--md { min-height:40px; padding:0 16px; font-size:14px; }
.ui-btn--lg { min-height:44px; padding:0 20px; font-size:15px; }
.ui-btn--icon { width:36px; height:36px; padding:0; }
.ui-btn--block { width:100%; }
.ui-btn--primary { background:var(--accent-solid); color:var(--accent-ink); }
.ui-btn--primary:not(:disabled):hover { background:var(--accent-solid-hover); }
.ui-btn--primary:not(:disabled):active { background:var(--accent-solid-active); }
.ui-btn--secondary { background:var(--surface-1); color:var(--fg); border-color:var(--control-line); }
.ui-btn--secondary:not(:disabled):hover { background:var(--surface-3); }
.ui-btn--ghost { background:transparent; color:var(--fg-muted); }
.ui-btn--ghost:not(:disabled):hover { background:var(--surface-3); color:var(--fg); }
.ui-btn--danger { background:transparent; color:var(--danger); border-color:var(--line-strong); }
.ui-btn--danger:not(:disabled):hover { background:var(--danger-soft); border-color:var(--danger); }
.ui-btn:disabled { opacity:.5; cursor:not-allowed; }
.ui-btn-spinner { width:14px; height:14px; flex:none; border:2px solid currentColor; border-top-color:transparent; border-radius:50%; animation:spin .7s linear infinite; }
@keyframes spin { to { transform:rotate(360deg); } }
.ui-btn-spinner,.ui-btn-label { position:relative; z-index:2; }
@media(pointer:coarse) { .ui-btn { min-height:44px; } .ui-btn--icon { width:44px; height:44px; } }

.ui-btn { position:relative; isolation:isolate; border-radius:6px; transition:background-color 150ms,border-color 150ms,color 150ms,box-shadow 150ms; }
.ui-btn--primary { border-color:transparent; background:linear-gradient(125deg,var(--accent-solid),var(--button-end)); box-shadow:inset 0 1px 0 rgba(255,255,255,.24),0 3px 8px rgba(49,77,142,.19); border-color:rgba(255,255,255,.18); }
.ui-btn--primary:not(:disabled):hover { box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 4px 14px rgba(49,77,142,.28); }
.ui-btn--secondary { border-color:var(--line-strong); background:linear-gradient(180deg,var(--surface-1),var(--surface-2)); box-shadow:inset 0 1px 0 var(--glass-surface),0 1px 3px rgba(30,46,70,.06); }


.ui-btn-label { display:inline-flex; align-items:center; justify-content:center; gap:8px; }
.ui-btn--secondary { box-shadow:inset 0 1px 0 var(--material-edge),0 1px 3px rgba(30,46,70,.06); }

</style>
