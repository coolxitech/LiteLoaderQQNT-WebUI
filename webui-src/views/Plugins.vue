<script setup lang="ts">
// 已安装插件页：搜索过滤 + 启停开关 + 标记删除弹窗。
// 页面标题与描述由顶栏 AppTopbar 渲染，全局提示由 App.vue 转成 Toast，这里都不再重复。
import { computed } from "vue";
import { Package, Search, SearchX, Trash2 } from "lucide-vue-next";
import Alert from "@/components/ui/Alert.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Checkbox from "@/components/ui/Checkbox.vue";
import Dialog from "@/components/ui/Dialog.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import Input from "@/components/ui/Input.vue";
import Switch from "@/components/ui/Switch.vue";
import Tooltip from "@/components/ui/Tooltip.vue";
import Ease from "@/components/effects/Ease.vue";
import {
    isPending,
    closeDelete,
    confirmDelete,
    delete_data,
    delete_self,
    delete_target,
    filtered_plugins,
    loadPlugins,
    openDelete,
    plugin_keyword,
    plugins,
    togglePlugin
} from "../store";

// 列表刷新避免与启停、删除后的列表回读竞争；不同插件仍可独立操作。
const plugins_mutating = computed(() => plugins.value.some(plugin =>
    isPending("plugin:" + plugin.slug) || isPending("delete:" + plugin.slug)));

// 弹窗的开关由 delete_target 推导，关闭时统一回到 store 的 closeDelete
function handle_delete_open(value: boolean): void {
    if (!value) closeDelete();
}
</script>

<template>
    <section class="view">
        <!-- 工具条：搜索 / 计数 / 刷新 -->
        <div class="toolbar">
            <Input
                v-model="plugin_keyword"
                type="search"
                placeholder="搜索插件名称或 slug"
                aria-label="搜索插件"
                class="toolbar-search"
            >
                <template #prefix>
                    <Search :size="14" aria-hidden="true" />
                </template>
            </Input>
            <div class="toolbar-spacer" aria-hidden="true"></div>
            <span class="toolbar-count mono tabular">{{ filtered_plugins.length }} / {{ plugins.length }}</span>
            <Button variant="ghost" :loading="isPending('plugins')" :disabled="plugins_mutating" @click="loadPlugins">刷新</Button>
        </div>

        <!-- 空状态：插件目录里还没有任何插件 -->
        <Card v-if="plugins.length === 0" padding="none">
            <EmptyState
                title="还没有已安装的插件"
                description="把插件目录放进 LiteLoader 的 plugins 目录，或到插件市场安装。"
                :icon="Package"
            >
                <template #actions>
                    <Button variant="secondary" :loading="isPending('plugins')" :disabled="plugins_mutating" @click="loadPlugins">重新读取</Button>
                </template>
            </EmptyState>
        </Card>

        <!-- 空状态：有插件但搜索没有命中 -->
        <Card v-else-if="filtered_plugins.length === 0" padding="none">
            <EmptyState
                title="没有匹配的插件"
                description="换个关键词试试，或清空搜索。"
                :icon="SearchX"
            >
                <template #actions>
                    <Button variant="secondary" @click="plugin_keyword = ''">清空搜索</Button>
                </template>
            </EmptyState>
        </Card>

        <!-- 插件表格：窄屏会折叠成卡片列表；整块入场用 animate.css 的 fadeIn，行内不做动画以免表格错位 -->
        <Ease v-else name="fadeIn" :duration="220">
        <Card padding="none" class="plugins-card">
            <div class="plugins-table-wrap">
                <table class="plugins-table">
                    <caption class="sr-only">已安装插件列表</caption>
                    <thead>
                        <tr>
                            <th scope="col">插件</th>
                            <th scope="col">版本</th>
                            <th scope="col">类型</th>
                            <th scope="col">状态</th>
                            <th scope="col" class="plugins-th-actions">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="plugin in filtered_plugins" :key="plugin.slug">
                            <td class="plugins-cell-main">
                                <span class="plugin-name">{{ plugin.name }}</span>
                                <span class="plugin-slug mono">{{ plugin.slug }}</span>
                            </td>
                            <td data-label="版本">
                                <span class="mono tabular">{{ plugin.version || "-" }}</span>
                            </td>
                            <td data-label="类型">
                                <span>{{ plugin.type }}</span>
                            </td>
                            <td data-label="状态">
                                <div class="plugin-status">
                                    <span>{{ plugin.loaded ? "已加载" : "未加载" }}</span>
                                    <span v-if="plugin.incompatible" class="compatibility-warning">平台不兼容</span>
                                </div>
                            </td>
                            <td data-label="操作" class="plugins-cell-actions">
                                <div class="plugin-actions">
                                    <Switch
                                        :model-value="plugin.enabled"
                                        :loading="isPending('plugin:' + plugin.slug)"
                                        :disabled="isPending('plugins') || isPending('delete:' + plugin.slug)"
                                        :aria-label="(plugin.enabled ? '禁用 ' : '启用 ') + plugin.name"
                                        @update:model-value="togglePlugin(plugin)"
                                    />
                                    <Tooltip :text="'标记删除 ' + plugin.name">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            :loading="isPending('delete:' + plugin.slug)"
                                            :disabled="isPending('plugins') || isPending('plugin:' + plugin.slug)"
                                            :aria-label="'标记删除 ' + plugin.name"
                                            @click="openDelete(plugin)"
                                        >
                                            <Trash2 :size="14" aria-hidden="true" />
                                        </Button>
                                    </Tooltip>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </Card>
        </Ease>

        <!-- 标记删除确认弹窗：真正删除发生在下次启动 QQ 时 -->
        <Dialog
            :open="delete_target !== null"
            :title="'标记删除 ' + (delete_target?.name ?? '')"
            description="删除会在下次启动 QQ 时执行，本次运行中插件仍然可用。"
            @update:open="handle_delete_open"
        >
            <div class="delete-body">
                <Alert tone="warn">勾选项会在下次启动 QQ 时被真正删除，此操作不可撤销。</Alert>
                <Checkbox v-model="delete_self">删除插件本体 <code class="mono">plugins/{{ delete_target?.slug }}</code></Checkbox>
                <Checkbox v-model="delete_data">删除插件数据 <code class="mono">data/{{ delete_target?.slug }}</code></Checkbox>
            </div>
            <template #footer>
                <Button variant="ghost" @click="closeDelete">取消</Button>
                <Button variant="danger" :loading="isPending('delete:' + (delete_target?.slug ?? ''))" @click="confirmDelete">确认标记</Button>
            </template>
        </Dialog>
    </section>
</template>

<style scoped>
.view { display:flex; flex-direction:column; gap:16px; min-width:0; }
.toolbar { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
.toolbar-search { flex:1 1 240px; max-width:340px; }
.toolbar-spacer { margin-left:auto; }
.toolbar-count { font-family:var(--font-sans); font-size:12px; color:var(--fg-muted); white-space:nowrap; }

.plugins-table { width:100%; border-collapse:collapse; text-align:left; }
.plugins-table th { font-size:12px; font-weight:500; color:var(--fg-muted); padding:10px 16px; border-bottom:1px solid var(--line); background:var(--surface-2); }
.plugins-table td { padding:10px 16px; height:64px; border-bottom:1px solid var(--line); vertical-align:middle; }
.plugins-table tr:last-child td { border-bottom:0; }
.plugins-table tbody tr:hover { background:var(--surface-2); }
.plugin-name { display:block; font-weight:600; overflow-wrap:anywhere; }
.plugin-slug { display:block; font-family:var(--font-sans); font-size:12px; color:var(--fg-muted); overflow-wrap:anywhere; }
.plugin-status { display:flex; flex-direction:column; gap:2px; color:var(--fg-muted); font-size:12px; }
.compatibility-warning { color:var(--warn); }
.plugins-th-actions { text-align:right; }
.plugins-cell-actions { width:1%; white-space:nowrap; }
.plugin-actions { display:flex; justify-content:flex-end; align-items:center; gap:8px; }
.delete-body { display:flex; flex-direction:column; gap:12px; }
.delete-body code { overflow-wrap:anywhere; }
@media(max-width:767px) {
 .toolbar-search { flex-basis:100%; max-width:none; }
 .plugins-table thead { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
 .plugins-table,.plugins-table tbody { display:block; }
 .plugins-table tr { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 12px; padding:12px; border-bottom:1px solid var(--line); }
 .plugins-table tr:last-child { border-bottom:0; }
 .plugins-table td { display:block; padding:0; border:0; height:auto; }
 .plugins-cell-main { grid-column:1; grid-row:1; }
 .plugins-table td[data-label="版本"] { grid-column:1; grid-row:2; color:var(--fg-muted); font-size:12px; }
 .plugins-table td[data-label="类型"] { grid-column:1; grid-row:3; color:var(--fg-muted); font-size:12px; }
 .plugins-table td[data-label="状态"] { grid-column:2; grid-row:2 / 4; text-align:right; align-self:center; }
 .plugins-table td.plugins-cell-actions { grid-column:2; grid-row:1; width:auto; }
 .plugin-actions { gap:8px; }
}

.toolbar { padding:12px; border:1px solid var(--line); border-radius:8px; background:var(--glass-surface); box-shadow:var(--elev-1); }
.plugins-card { overflow:hidden; }
.plugins-table th { background:linear-gradient(180deg,var(--surface-2),var(--surface-3)); height:42px; }
.plugins-table tbody { background:var(--surface-1); }
.plugins-table td { height:68px; }
.plugin-status > span:first-child { display:inline-flex; align-items:center; gap:6px; }
.plugin-status > span:first-child::before { content:""; width:4px; height:4px; border-radius:50%; background:currentColor; }
@media(max-width:767px) { .plugins-table td { height:auto; } .toolbar { padding:10px; } }


.plugins-card { overflow:hidden; box-shadow:var(--card-shadow); }
.plugins-table th { background:linear-gradient(110deg,var(--surface-2),var(--accent-soft)); }
.plugin-status { color:var(--fg-muted); }
.plugins-table tbody tr { transition:background-color 160ms ease-out; }


@media(max-width:767px) {
 .toolbar { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; padding:10px; }
 .toolbar-search { grid-column:1 / -1; min-width:0; max-width:none; width:100%; }
 .toolbar-spacer { display:none; }
 .toolbar-count { font-size:12px; }
 .plugin-slug,.plugin-status,.plugins-table td[data-label="版本"],.plugins-table td[data-label="类型"] { font-size:13px; }
}

</style>
