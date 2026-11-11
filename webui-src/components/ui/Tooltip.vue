<script setup lang="ts">
// 统一的悬停提示：内部自带一层 TooltipProvider，保证每个提示的延迟一致
import { TooltipContent, TooltipPortal, TooltipProvider, TooltipRoot, TooltipTrigger } from "reka-ui";

type TooltipSide = "top" | "bottom" | "left" | "right";

withDefaults(defineProps<{
    text: string;
    side?: TooltipSide;
}>(), {
    side: "top"
});
</script>

<template>
    <TooltipProvider :delay-duration="200">
        <TooltipRoot>
            <!-- as-child 让触发元素直接复用 slot 里的节点，不额外套一层 span -->
            <TooltipTrigger as-child>
                <slot />
            </TooltipTrigger>
            <TooltipPortal>
                <TooltipContent :side="side" :side-offset="6" class="ui-tooltip">
                    {{ text }}
                </TooltipContent>
            </TooltipPortal>
        </TooltipRoot>
    </TooltipProvider>
</template>

<style scoped>
/* 提示气泡：深色浮层，靠投影与边框和内容区分开 */
.ui-tooltip {
    z-index: var(--z-toast);
    max-width: 260px;
    padding: var(--sp-2) var(--sp-4);
    border: 1px solid var(--line-strong);
    border-radius: var(--r-xs);
    background: var(--surface-3);
    color: var(--fg);
    font-size: var(--text-2xs);
    line-height: 1.5;
    box-shadow: var(--elev-2);
}


.ui-tooltip { border-radius:6px; background:var(--surface-1); }

</style>
