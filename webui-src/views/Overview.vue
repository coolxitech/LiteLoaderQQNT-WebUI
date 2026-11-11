<script setup lang="ts">
import { PackageCheck, ServerCrash } from "lucide-vue-next";
import Button from "@/components/ui/Button.vue";
import CopyButton from "@/components/ui/CopyButton.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import Skeleton from "@/components/ui/Skeleton.vue";
import InspiraAurora from "@/components/effects/InspiraAurora.vue";
import InspiraBorderBeam from "@/components/effects/InspiraBorderBeam.vue";
import InspiraNumberTicker from "@/components/effects/InspiraNumberTicker.vue";
import Ease from "@/components/effects/Ease.vue";
import { isPending, checkUpdate, counts, loadStatus, path_rows, status, update_result, version_cards } from "../store";
</script>
<template>
 <section class="overview">
  <template v-if="status">
   <Ease name="zoomIn" :duration="280">
   <section class="runtime-hero">
    <InspiraAurora />
    <div class="hero-top">
     <div class="hero-copy"><span class="hero-mark"><PackageCheck :size="23" aria-hidden="true" /></span><div><h2>插件运行概况</h2><p>查看当前加载器与插件环境</p></div></div>
     <Button variant="secondary" :loading="isPending('status')" @click="loadStatus">刷新信息</Button>
    </div>
    <div class="hero-bottom"><p>已安装 <strong><InspiraNumberTicker :value="counts.installed" /></strong> 个，已加载 <strong><InspiraNumberTicker :value="counts.loaded" /></strong> 个</p></div>
    <InspiraBorderBeam />
   </section>
   </Ease>
   <Ease name="fadeInUp" :duration="240" :delay="60">
   <div class="workspace">
    <section class="info-group"><h2>运行环境</h2><dl class="runtime"><div v-for="row in version_cards" :key="row.label"><dt>{{ row.label }}</dt><dd>{{ row.value }}</dd></div></dl></section>
    <section class="info-group"><h2>本地目录</h2><dl class="paths"><div v-for="row in path_rows" :key="row.label"><dt>{{ row.label }}</dt><dd>{{ row.value }}</dd><CopyButton :value="row.value" :label="'复制' + row.label + '路径'" /></div></dl></section>
    <section class="info-group update"><div class="update-row"><div><h2>加载器更新</h2><p>检查官方仓库的新版本，仅提示更新信息。</p></div><Button variant="primary" shimmer="always" :loading="isPending('update')" @click="checkUpdate">检查更新</Button></div><p v-if="update_result" class="update-result" role="status">{{ update_result }}</p></section>
   </div>
   </Ease>
  </template>
  <div v-else-if="isPending('status')" class="workspace loading" role="status" aria-label="正在读取运行信息"><Skeleton :lines="8" /></div>
  <EmptyState v-else title="读取失败" description="请确认 QQ 与 LiteLoader 仍在运行，然后重试。" :icon="ServerCrash"><template #actions><Button :loading="isPending('status')" @click="loadStatus">重新读取</Button></template></EmptyState>
 </section>
</template>
<style scoped>
.overview { display:flex; flex-direction:column; gap:20px; }
/* Hero is the Inspira UI stage: aurora fills it, and every piece of copy sits on its own glass plate so
   the contrast never depends on which band happens to be behind the text. */
/* 高度按「顶栏 + 一条完整极光带 + 计数条」推定：208px 会把极光压成 33px 的缝，故回到 244px */
.runtime-hero { position:relative; overflow:hidden; isolation:isolate; display:flex; flex-direction:column; gap:12px; min-height:244px; padding:20px; border:1px solid transparent; border-radius:16px; background:linear-gradient(118deg,var(--glass-strong),var(--hero-middle) 52%,var(--hero-end)) padding-box,var(--edge-gradient) border-box; box-shadow:var(--card-shadow); }
/* Top bar: title plate left, plain secondary button right — the button itself sits bare on the aurora so
   the empty top-right corner gets an anchor without a second glass panel. */
.hero-top { position:relative; z-index:1; display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; min-width:0; }
.hero-copy { position:relative; z-index:1; align-self:flex-start; display:flex; align-items:center; gap:14px; width:fit-content; max-width:100%; padding:12px 18px 12px 14px; border:1px solid var(--material-edge); border-radius:14px; background:var(--glass-strong); box-shadow:var(--elev-1); }
.hero-copy > div { min-width:0; }
.hero-mark { display:grid; place-items:center; width:48px; height:48px; border:1px solid var(--accent-line); border-radius:12px; color:var(--accent-text); background:var(--glass-surface); box-shadow:0 5px 16px rgba(59,84,136,.12); }
.hero-copy h2 { font-size:20px; margin-bottom:4px; }
.hero-copy p { color:var(--fg-muted); }
.hero-bottom { position:relative; z-index:1; margin-top:auto; display:flex; align-items:center; flex-wrap:wrap; gap:12px; padding:10px 14px; border:1px solid var(--material-edge); border-radius:12px; background:var(--glass-strong); color:var(--fg-muted); box-shadow:var(--elev-1); }
.hero-bottom strong { color:var(--fg); font-size:22px; font-weight:650; padding:0 3px; }
.workspace { background:var(--surface-1); border:1px solid var(--line); border-radius:8px; padding:0 24px; box-shadow:var(--elev-1); }
.info-group { padding:24px 0; } .info-group + .info-group { border-top:1px solid var(--line); }
h2 { font-size:15px; margin-bottom:16px; }
dl { margin:0; } dt { color:var(--fg-muted); } dd { margin:0; overflow-wrap:anywhere; }
.runtime { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); column-gap:48px; }
.runtime > div { display:grid; grid-template-columns:112px minmax(0,1fr); gap:12px; padding:8px 0; }
.paths > div { display:grid; grid-template-columns:112px minmax(0,1fr) 32px; gap:12px; align-items:center; min-height:44px; }
.paths > div + div { border-top:1px solid var(--line); }
.paths dd { font-size:13px; }
.update-row { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.update h2 { margin-bottom:4px; } .update p { color:var(--fg-muted); }
.update-result { margin-top:16px; overflow-wrap:anywhere; }
.loading { padding:24px; }
@media(max-width:600px) { .runtime-hero { padding:14px; min-height:212px; gap:12px; } .hero-top { gap:10px; } .hero-top .ui-btn { margin-left:auto; } .hero-copy { padding:10px 14px 10px 12px; } .hero-bottom strong { font-size:18px; } .workspace { padding:0 16px; } .runtime { grid-template-columns:1fr; } .info-group { padding:20px 0; } .paths > div { grid-template-columns:minmax(0,1fr) 32px; padding:8px 0; gap:4px 8px; } .paths dt { grid-column:1; } .paths dd { grid-row:2; grid-column:1; } .paths :deep(.ui-copy) { grid-row:1 / 3; grid-column:2; } .update-row { align-items:flex-start; } }

.workspace { border-radius:12px; background:var(--glass-strong); box-shadow:var(--card-shadow),inset 0 1px 0 var(--material-edge); }
.info-group h2 { display:flex; align-items:center; gap:8px; }
.info-group h2::before { content:""; width:4px; height:14px; border-radius:3px; background:var(--accent-line); }
.runtime dd { font-weight:600; font-variant-numeric:tabular-nums; }

</style>
