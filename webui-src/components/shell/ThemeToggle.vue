<script setup lang="ts">
// 主题切换：读 store 里的 theme，点击后写回 <html data-theme> 与 localStorage
import { Moon, Sun } from "lucide-vue-next";
import { theme, toggleTheme } from "@/store";
</script>

<template>
    <button
        type="button"
        class="theme-toggle"
        :aria-label="'切换到' + (theme === 'dark' ? '浅色' : '深色') + '主题'"
        title="切换主题"
        @click="toggleTheme()"
    >
        <Moon v-if="theme === 'dark'" :size="16" aria-hidden="true" />
        <Sun v-else :size="16" aria-hidden="true" />
        <span>{{ theme === "dark" ? "深色" : "浅色" }}</span>

    </button>
</template>

<style scoped>
.theme-toggle { min-height:36px; display:flex; align-items:center; gap:8px; padding:0 12px; border:0; border-radius:4px; background:transparent; color:var(--fg-muted); font:inherit; cursor:pointer; transition:background-color 150ms; }
.theme-toggle:hover { background:var(--surface-3); color:var(--fg); }
@media(max-width:900px) { .theme-toggle { min-height:44px; padding:0 8px; } }
</style>
