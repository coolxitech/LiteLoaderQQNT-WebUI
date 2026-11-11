<script setup lang="ts">
import { plugins, busy, plugin_keyword, delete_target, delete_self, delete_data, filtered_plugins, loadPlugins, togglePlugin, openDelete, closeDelete, confirmDelete } from "../store";
</script>

<template>
    <section class="webui-view">
        <h2 class="webui-view-title">插件</h2>
        <p class="webui-view-desc">启用状态写入 LiteLoader 配置的 disabled_plugins；标记删除在下次启动 QQ 时执行。</p>
        <div class="webui-toolbar">
            <input class="webui-input" type="search" v-model="plugin_keyword" placeholder="搜索插件名称或 slug">
            <button class="webui-btn webui-btn-ghost" type="button" :disabled="busy === 'plugins'" @click="loadPlugins">{{ busy === 'plugins' ? '刷新中…' : '刷新' }}</button>
        </div>
        <div v-if="!plugins.length" class="webui-card webui-empty">还没有已安装的插件</div>
        <div v-else class="webui-table-wrap">
            <table class="webui-table">
                <thead>
                    <tr>
                        <th>插件</th>
                        <th>版本</th>
                        <th>类型</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="plugin in filtered_plugins" :key="plugin.slug">
                        <td>
                            <div class="webui-plugin-name">{{ plugin.name }}</div>
                            <div class="webui-plugin-slug">{{ plugin.slug }}</div>
                        </td>
                        <td>{{ plugin.version || '-' }}</td>
                        <td>{{ plugin.type }}</td>
                        <td>
                            <div class="webui-tags">
                                <span :class="['webui-tag', plugin.enabled ? 'is-ok' : 'is-off']">{{ plugin.enabled ? '已启用' : '已禁用' }}</span>
                                <span :class="['webui-tag', plugin.loaded ? 'is-ok' : 'is-off']">{{ plugin.loaded ? '已加载' : '未加载' }}</span>
                                <span v-if="plugin.incompatible" class="webui-tag is-warn">平台不兼容</span>
                            </div>
                        </td>
                        <td>
                            <div class="webui-actions">
                                <button class="webui-btn webui-btn-sm" type="button" :disabled="busy === 'plugin:' + plugin.slug" @click="togglePlugin(plugin)">{{ plugin.enabled ? '禁用' : '启用' }}</button>
                                <button class="webui-btn webui-btn-sm webui-btn-danger" type="button" :disabled="busy === 'delete:' + plugin.slug" @click="openDelete(plugin)">标记删除</button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div v-if="delete_target" class="webui-modal-mask" @click.self="closeDelete">
            <div class="webui-modal">
                <h3 class="webui-modal-title">标记删除 {{ delete_target.name }}</h3>
                <p class="webui-hint is-warn">删除会在下次启动 QQ 时执行，本次运行中插件仍然可用。</p>
                <label class="webui-checkbox">
                    <input type="checkbox" v-model="delete_self">
                    <span>删除插件本体（plugins/{{ delete_target.slug }}）</span>
                </label>
                <label class="webui-checkbox">
                    <input type="checkbox" v-model="delete_data">
                    <span>删除插件数据（data/{{ delete_target.slug }}）</span>
                </label>
                <div class="webui-modal-actions">
                    <button class="webui-btn webui-btn-ghost" type="button" @click="closeDelete">取消</button>
                    <button class="webui-btn webui-btn-danger" type="button" :disabled="busy === 'delete:' + delete_target.slug" @click="confirmDelete">确认标记</button>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
/* 插件表格 */
.webui-table-wrap {
    background: var(--webui-surface);
    border: 1px solid var(--webui-border);
    border-radius: var(--webui-radius);
    box-shadow: var(--webui-shadow);
    overflow-x: auto;
}

.webui-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
}

.webui-table th,
.webui-table td {
    padding: 12px 14px;
    text-align: left;
    vertical-align: middle;
    border-bottom: 1px solid var(--webui-border);
}

.webui-table th {
    background: var(--webui-surface-alt);
    color: var(--webui-text-mute);
    font-weight: 600;
    font-size: 12.5px;
    white-space: nowrap;
}

.webui-table tbody tr:last-child td {
    border-bottom: none;
}

.webui-table tbody tr:hover {
    background: var(--webui-surface-alt);
}

.webui-plugin-name {
    font-weight: 600;
}

.webui-plugin-slug {
    color: var(--webui-text-mute);
    font-family: var(--webui-mono);
    font-size: 12px;
}

/* 标记删除弹窗 */
.webui-modal-mask {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(16, 24, 40, .38);
}

.webui-modal {
    width: 100%;
    max-width: 420px;
    background: var(--webui-surface);
    border-radius: var(--webui-radius);
    box-shadow: 0 12px 32px rgba(16, 24, 40, .24);
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.webui-modal-title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
}

.webui-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--webui-text-soft);
    font-size: 13.5px;
    cursor: pointer;
}

.webui-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 4px;
}
</style>
