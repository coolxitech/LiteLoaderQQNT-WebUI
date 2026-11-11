<script setup lang="ts">
// 配置页：直接编辑 LiteLoader 自身配置 JSON，带行号栏、滚动同步、Tab 缩进与语法校验
import { computed, nextTick, ref } from "vue";
import { errorText } from "../api";
import { config_dirty as is_dirty, config_loading, config_saving, config_text, isPending, loadConfig, saveConfig } from "../store";
const config_pending = computed(() => isPending("config"));
import Alert from "@/components/ui/Alert.vue";
import Badge from "@/components/ui/Badge.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Dialog from "@/components/ui/Dialog.vue";
import Skeleton from "@/components/ui/Skeleton.vue";
import Textarea from "@/components/ui/Textarea.vue";

// 缩进单位：与格式化输出的 4 空格区分开，编辑器内按 Tab 只补 2 空格，避免深层嵌套被推得太远
const indent_unit = "  ";

const input_ref = ref<InstanceType<typeof Textarea> | null>(null);
const gutter_ref = ref<HTMLElement | null>(null);
const reload_open = ref<boolean>(false);

const line_count = computed<number>(() => config_text.value.split("\n").length);
const char_count = computed<number>(() => config_text.value.length);

// 校验：既要能解析，也必须是 JSON 对象（后端只接受对象）
const parse_error = computed<string>(() => {
    try {
        const parsed: unknown = JSON.parse(config_text.value);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "配置必须是 JSON 对象";
        return "";
    }
    catch (caught) {
        return errorText(caught);
    }
});

// 从解析错误信息里还原出错行：优先用 "(line N column M)"，否则按 "position N" 的字符偏移换算
const parse_error_line = computed<number>(() => {
    const message = parse_error.value;
    if (message === "") return 0;
    const line_match = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
    if (line_match) {
        const line = Number.parseInt(line_match[1], 10);
        return Number.isFinite(line) && line > 0 ? line : 0;
    }
    const position_match = /position\s+(\d+)/i.exec(message);
    if (position_match) {
        const offset = Number.parseInt(position_match[1], 10);
        if (!Number.isFinite(offset) || offset < 0) return 0;
        return config_text.value.slice(0, offset).split("\n").length;
    }
    return 0;
});

// Textarea 的根节点就是原生 textarea：通过 $el 取回元素，供滚动归零使用
function input_element(): HTMLTextAreaElement | null {
    const instance = input_ref.value;
    if (!instance) return null;
    const element: unknown = instance.$el;
    return element instanceof HTMLTextAreaElement ? element : null;
}

// 重新加载后把行号栏与编辑区的滚动位置归零，避免残留旧偏移
function reset_scroll(): void {
    if (gutter_ref.value) gutter_ref.value.scrollTop = 0;
    const element = input_element();
    if (element) element.scrollTop = 0;
}

// 编辑区滚动时同步行号栏；行号栏 overflow:hidden 仍允许程序化滚动
function sync_scroll(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    if (gutter_ref.value && target) gutter_ref.value.scrollTop = target.scrollTop;
}

// Tab 键插入缩进而不是把焦点移出编辑器，插入后把光标放回缩进之后
async function insert_indent(event: KeyboardEvent): Promise<void> {
    const target = event.target as HTMLTextAreaElement | null;
    if (config_pending.value || !target || event.isComposing || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
    event.preventDefault();
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const value = target.value;
    config_text.value = value.slice(0, start) + indent_unit + value.slice(end);
    await nextTick();
    const caret = start + indent_unit.length;
    target.selectionStart = caret;
    target.selectionEnd = caret;
}

// 格式化：仅在解析成功且为对象时重排缩进，失败时什么都不做（错误由底部提示条展示）
function format_json(): void {
    if (config_pending.value) return;
    try {
        const parsed: unknown = JSON.parse(config_text.value);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
        config_text.value = JSON.stringify(parsed, null, 4);
    }
    catch {
        // 解析失败：保持原文，等用户先修好语法
    }
}

// 有未保存改动时先确认，避免一次误点丢掉编辑内容
async function request_reload(): Promise<void> {
    if (config_pending.value) return;
    if (is_dirty.value) {
        reload_open.value = true;
        return;
    }
    if (await loadConfig()) reset_scroll();
}

async function confirm_reload(): Promise<void> {
    reload_open.value = false;
    if (await loadConfig()) reset_scroll();
}

</script>

<template>
    <section class="view">
        <div class="toolbar">
            <Button variant="ghost" :loading="config_loading" :disabled="config_pending" @click="request_reload">重新加载</Button>
            <Button variant="ghost" :disabled="config_pending || !!parse_error" @click="format_json">格式化</Button>
            <Badge v-if="is_dirty" tone="warn" dot>未保存</Badge>
            <span class="toolbar-spacer" aria-hidden="true"></span>
            <Badge :tone="parse_error ? 'danger' : 'ok'" :dot="true">
                {{ parse_error ? "JSON 无效" : "JSON 有效" }}
            </Badge>
            <Button
                variant="primary"
                shimmer="hover"
                :loading="config_saving"
                :disabled="config_pending || !!parse_error || !is_dirty"
                @click="saveConfig"
            >
                保存
            </Button>
        </div>

        <Card v-if="config_loading && !config_text" padding="md">
            <Skeleton :lines="6" />
        </Card>

        <Card v-else padding="none" class="editor-card">
            <div class="editor-bar">
                <span class="editor-file mono">data/LiteLoader/config.json</span>
                <span class="editor-stat mono tabular">{{ line_count }} 行 · {{ char_count }} 字符</span>
            </div>

            <div class="editor">
                <div ref="gutter_ref" class="editor-gutter" aria-hidden="true">
                    <span
                        v-for="n in line_count"
                        :key="n"
                        class="editor-line-no"
                        :class="{ 'is-error': parse_error_line === n }"
                    >
                        {{ n }}
                    </span>
                </div>
                <Textarea
                    ref="input_ref"
                    v-model="config_text"
                    :disabled="config_pending"
                    class="editor-input"
                    mono
                    :spellcheck="false"
                    :invalid="!!parse_error"
                    aria-label="LiteLoader 配置 JSON"
                    wrap="off"
                    :rows="24"
                    @scroll="sync_scroll"
                    @keydown.tab="insert_indent"
                    aria-describedby="editor-help"
                />
            </div>

            <div class="editor-foot">
                <div class="foot-alert">
                    <div v-if="parse_error" role="alert"><Alert tone="danger" title="JSON 解析失败">{{ parse_error }}</Alert></div>
                    <p id="editor-help" class="editor-help">Tab 插入两个空格，Shift + Tab 移出编辑区。部分配置需重启 QQ 生效。</p>
                </div>
            </div>
        </Card>

        <Dialog
            v-model:open="reload_open"
            title="放弃未保存的修改？"
            description="重新加载会丢弃编辑器里的改动，恢复成磁盘上的配置。"
        >
            <template #footer>
                <Button variant="ghost" @click="reload_open = false">取消</Button>
                <Button variant="danger" :disabled="config_pending" @click="confirm_reload">重新加载</Button>
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

.editor-card { overflow:hidden; }
.editor-bar { display:flex; flex-wrap:wrap; gap:8px; padding:12px 16px; background:var(--surface-2); border-bottom:1px solid var(--line); }
.editor-file { font:12px var(--font-sans); overflow-wrap:anywhere; }
.editor-stat { margin-left:auto; font:12px var(--font-sans); color:var(--fg-muted); }
.editor { display:flex; height:clamp(360px,58vh,640px); overflow:hidden; }
.editor-gutter { flex:0 0 48px; padding:12px 10px 22px 0; overflow:hidden; text-align:right; user-select:none; background:var(--surface-2); border-right:1px solid var(--line); font:13px/1.7 var(--font-mono); color:var(--fg-muted); }
.editor-line-no { display:block; } .editor-line-no.is-error { color:var(--danger); font-weight:600; }
.editor .editor-input { flex:1; min-width:0; width:auto; height:100%; min-height:0; padding:12px 16px; border:0; border-radius:0; background:var(--surface-1); resize:none; overflow:auto; white-space:pre; font:13px/1.7 var(--font-mono); }
.editor .editor-input:focus { outline:none; box-shadow:inset 0 0 0 2px var(--ring); }
.editor .editor-input[aria-invalid="true"] { box-shadow:inset 0 0 0 1px var(--danger); }
.editor .editor-input[aria-invalid="true"]:focus { box-shadow:inset 0 0 0 2px var(--ring); }
.editor-foot { padding:12px 16px; border-top:1px solid var(--line); }
.editor-help { font-size:12px; color:var(--fg-muted); margin-top:4px; }
@media(max-width:600px) { .editor-gutter { flex-basis:36px; } .toolbar { gap:4px; } }
</style>
