<script setup lang="ts">
import { Plug, Github, LayoutDashboard, Package, SlidersHorizontal, Store } from "lucide-vue-next";
import { nav_items, view } from "@/store";
import ThemeToggle from "./ThemeToggle.vue";
const icons = [LayoutDashboard, Package, Store, SlidersHorizontal];
</script>
<template>
 <aside class="app-sidebar">
  <div class="brand"><span class="brand-symbol"><Plug :size="24" aria-hidden="true" /></span><span>LiteLoaderQQNT</span><small>插件管理</small></div>
  <nav aria-label="主导航"><a v-for="(item,index) in nav_items" :key="item.hash" :href="item.hash" :aria-current="view === item.hash ? 'page' : undefined"><component :is="icons[index]" :size="17" aria-hidden="true" />{{ item.label }}</a></nav>
  <div class="footer"><ThemeToggle /><a href="https://github.com/coolxitech/LiteLoaderQQNT-WebUI" target="_blank" rel="noopener noreferrer"><Github :size="16" aria-hidden="true" />GitHub</a></div>
 </aside>
</template>
<style scoped>
.app-sidebar { position:sticky; top:0; height:100vh; padding:28px 12px 16px; display:flex; flex-direction:column; border-right:1px solid var(--line); background:var(--bg); }
.brand { padding:0 12px 28px; display:flex; flex-direction:column; gap:4px; font-size:16px; font-weight:600; }
.brand small { font-size:12px; color:var(--fg-muted); font-weight:400; }
nav { display:grid; gap:4px; }
a { display:flex; gap:10px; align-items:center; padding:10px 12px; color:var(--fg-muted); border-radius:4px; border-left:2px solid transparent; text-decoration:none; transition:background-color 150ms,color 150ms; }
a:hover { background:var(--surface-3); color:var(--fg); }
a[aria-current] { background:var(--accent-soft); color:var(--accent-text); border-left-color:var(--accent); font-weight:600; }
.footer { margin-top:auto; border-top:1px solid var(--line); padding-top:12px; display:grid; gap:4px; }

.app-sidebar { background:linear-gradient(165deg,var(--glass-surface),var(--bg) 65%); padding-top:32px; }
.brand { position:relative; padding:0 10px 30px; gap:5px; }
.brand-symbol { width:44px; height:44px; display:grid; place-items:center; margin-bottom:12px; border-radius:12px; color:var(--accent-text); border:1px solid var(--accent-line); background:linear-gradient(135deg,var(--surface-1),var(--hero-middle) 65%,var(--hero-end)); box-shadow:0 6px 20px rgba(63,88,146,.15),inset 0 1px 0 rgba(255,255,255,.6); }
nav { gap:8px; }
a { min-height:42px; border-radius:6px; }
a[aria-current] { background:linear-gradient(100deg,var(--accent-soft),var(--hero-middle)); box-shadow:inset 0 1px 0 var(--glass-surface),0 2px 6px rgba(48,69,110,.06); }
.footer { padding-top:16px; }


.app-sidebar { background:linear-gradient(165deg,var(--glass-strong),var(--glass)); backdrop-filter:blur(18px); box-shadow:inset -1px 0 0 var(--material-edge); }
a[aria-current] { background:linear-gradient(110deg,var(--accent-soft),var(--surface-1)); border:1px solid var(--accent-line); border-left:2px solid var(--accent); box-shadow:inset 0 1px 0 var(--material-edge),0 3px 8px rgba(62,82,145,.05); }
.brand-symbol { color:var(--accent-ink); background:linear-gradient(140deg,var(--button-start),var(--button-end)); box-shadow:0 6px 20px rgba(63,88,146,.18),inset 0 1px 0 rgba(255,255,255,.35); }

</style>
