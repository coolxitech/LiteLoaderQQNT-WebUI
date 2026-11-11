<script setup>
import { config_text, config_loading, busy, loadConfig, saveConfig } from "../store.js";
</script>

<template>
    <section class="webui-view">
        <h2 class="webui-view-title">配置</h2>
        <p class="webui-view-desc">直接编辑 LiteLoader 自身配置（data/LiteLoader/config.json）。保存前会校验 JSON 语法，部分改动需重启 QQ 生效。</p>
        <div class="webui-toolbar">
            <button class="webui-btn webui-btn-ghost" type="button" :disabled="config_loading" @click="loadConfig">{{ config_loading ? '读取中…' : '重新加载' }}</button>
            <button class="webui-btn" type="button" :disabled="busy === 'config'" @click="saveConfig">{{ busy === 'config' ? '保存中…' : '保存' }}</button>
        </div>
        <div v-if="config_loading && !config_text" class="webui-card webui-skeleton">
            <div class="webui-skeleton-row"></div>
            <div class="webui-skeleton-row"></div>
            <div class="webui-skeleton-row is-short"></div>
        </div>
        <textarea v-else class="webui-textarea" v-model="config_text" spellcheck="false"></textarea>
    </section>
</template>
