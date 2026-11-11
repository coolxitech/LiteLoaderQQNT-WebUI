<script setup lang="ts">
import { nav_items, view } from "@/store";
</script>
<template><nav class="app-mobile-nav" aria-label="窄屏主导航"><a v-for="item in nav_items" :key="item.hash" :href="item.hash" :aria-current="view === item.hash ? 'page' : undefined">{{ item.label }}</a></nav></template>
<style scoped>
.app-mobile-nav { display:none; }
@media(max-width:900px) { .app-mobile-nav { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); padding:0 16px; border-bottom:1px solid var(--line); background:var(--bg); } a { display:flex; align-items:center; justify-content:center; min-height:44px; color:var(--fg-muted); font-size:14px; text-decoration:none; border-bottom:2px solid transparent; } a[aria-current] { color:var(--accent-text); border-bottom-color:var(--accent); font-weight:600; } a:hover { background:var(--surface-3); } }

@media(max-width:900px) { .app-mobile-nav { background:var(--glass-surface); box-shadow:0 3px 12px rgba(38,58,93,.05); } a[aria-current] { background:linear-gradient(180deg,transparent,var(--accent-soft)); } }

</style>
