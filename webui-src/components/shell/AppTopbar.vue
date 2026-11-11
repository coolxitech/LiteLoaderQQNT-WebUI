<script setup lang="ts">
import ThemeToggle from "./ThemeToggle.vue";
defineProps<{title:string;desc:string}>();
</script>
<template><header class="app-topbar"><div><h1>{{ title }}</h1><p>{{ desc }}</p></div><div class="mobile-theme"><ThemeToggle /></div></header></template>
<style scoped>
.app-topbar { display:flex; align-items:center; justify-content:space-between; gap:16px; width:100%; max-width:1164px; margin:auto; padding:32px 32px 24px; }
h1 { font-size:24px; } p { margin-top:6px; color:var(--fg-muted); font-size:14px; }
.mobile-theme { display:none; flex:none; }
@media(max-width:900px) { .app-topbar { padding:20px 16px 16px; } .mobile-theme { display:block; } }
@media(max-width:480px) { p { max-width:27ch; } }

.app-topbar { padding-top:36px; padding-bottom:28px; position:relative; }
h1 { font-size:26px; letter-spacing:-.02em; }
h1::before { content:""; display:inline-block; width:5px; height:23px; border-radius:3px; margin-right:12px; vertical-align:-2px; background:linear-gradient(180deg,var(--accent),#61a2bf); }
p { padding-left:17px; margin-top:8px; }
@media(max-width:900px) { .app-topbar { padding:22px 16px 18px; } h1 { font-size:23px; } }


h1 { font-weight:650; letter-spacing:-.025em; }
.app-topbar__text { position:relative; }

</style>
