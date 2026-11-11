<script setup lang="ts">
// 插件市场：官方清单的浏览、筛选、安装 / 更新 / 卸载（卸载走确认弹窗）
import { computed } from "vue";
import { ArrowUpRight, Github, Package, Search, SearchX, Users } from "lucide-vue-next";
import Alert from "@/components/ui/Alert.vue";
import Badge from "@/components/ui/Badge.vue";
import Button from "@/components/ui/Button.vue";
import Card from "@/components/ui/Card.vue";
import Dialog from "@/components/ui/Dialog.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import Input from "@/components/ui/Input.vue";
import SegmentedControl from "@/components/ui/SegmentedControl.vue";
import Skeleton from "@/components/ui/Skeleton.vue";
import InspiraMagicCard from "@/components/effects/InspiraMagicCard.vue";
import Ease from "@/components/effects/Ease.vue";
import {
    closeUninstall,
    confirmUninstall,
    filtered_market,
    installMarket,
    loadMarket,
    market,
    market_keyword,
    isPending,
    market_type,
    openDetail,
    openUninstall,
    uninstall_target
} from "../store";

const market_mutating = computed(() => market.value.some(entry => isPending("market:" + entry.slug)));

// 类型筛选项：空字符串代表不过滤，与 store 里 market_type 的取值保持一致
const type_options: { value: string; label: string }[] = [
    { value: "", label: "全部" },
    { value: "extension", label: "扩展" },
    { value: "theme", label: "主题" },
    { value: "framework", label: "框架" }
];

// 清单里的 type 是英文标识，展示时换成中文；未知类型原样返回
function type_label(type: string): string {
    if (type === "extension") return "扩展";
    if (type === "theme") return "主题";
    if (type === "framework") return "框架";
    return type;
}

// 只有 http(s) 图标才能直接给 img，其余（空串或本地相对路径）退化成首字母
function is_remote_icon(icon: string): boolean {
    return icon.startsWith("http");
}

function reset_filters(): void {
    market_keyword.value = "";
    market_type.value = "";
}

// 弹窗被遮罩点击 / Esc 关闭时同步清空待卸载条目
function handle_uninstall_open(value: boolean): void {
    if (!value) closeUninstall();
}
</script>

<template>
    <section class="view">
        <!-- 工具条：搜索、类型筛选、结果计数与刷新 -->
        <div class="toolbar">
            <Input
                v-model="market_keyword"
                type="search"
                placeholder="搜索名称、slug 或描述"
                aria-label="搜索插件市场"
                class="toolbar-search"
            >
                <template #prefix>
                    <Search :size="14" aria-hidden="true" />
                </template>
            </Input>
            <SegmentedControl class="toolbar-filters" v-model="market_type" :options="type_options" aria-label="按类型筛选" />
            <div class="toolbar-spacer" aria-hidden="true"></div>
            <span class="toolbar-count mono tabular">{{ filtered_market.length }} / {{ market.length }}</span>
            <Button class="toolbar-refresh" variant="ghost" :loading="isPending('market')" :disabled="market_mutating" @click="loadMarket(true)">刷新列表</Button>
        </div>

        <!-- 首次加载：骨架占位 -->
        <div v-if="isPending('market') && market.length === 0" class="market-grid">
            <Card v-for="n in 6" :key="n" padding="sm" class="market-skeleton">
                <Skeleton :lines="1" height="40px" />
                <Skeleton :lines="2" />
            </Card>
        </div>

        <!-- 清单本身为空：多半是网络或清单接口异常 -->
        <Card v-else-if="market.length === 0" padding="none">
            <EmptyState
                title="插件清单为空"
                description="没有读取到官方清单，可能是网络问题或清单接口异常。"
                :icon="Package"
            >
                <template #actions>
                    <Button variant="secondary" :loading="isPending('market')" :disabled="market_mutating" @click="loadMarket(true)">重新加载</Button>
                </template>
            </EmptyState>
        </Card>

        <!-- 有关键词 / 类型筛选但没有命中 -->
        <Card v-else-if="filtered_market.length === 0" padding="none">
            <EmptyState title="没有匹配的插件" description="换个关键词或切换类型筛选。" :icon="SearchX">
                <template #actions>
                    <Button variant="secondary" @click="reset_filters">清除筛选</Button>
                </template>
            </EmptyState>
        </Card>

        <!-- 市场卡片：可更新条目用 accent 色调，其余保持默认；InspiraMagicCard 提供跟随光标的内部高光。
             安装 / 更新按钮用 shimmer="hover"：卡片是并列网格，持续旋转会让三张卡的主按钮同时闪光、
             权重摊平（评审已否决），所以光泽只在该按钮自身悬停 / 键盘聚焦时出现，同一时刻最多一处。 -->
        <div v-else class="market-grid">
            <Ease
                v-for="(entry, index) in filtered_market"
                :key="entry.slug"
                class="ease-item"
                name="fadeInUp"
                :index="index"
                :duration="260"
            >
            <InspiraMagicCard tag="article" class="market-card">
                <div class="market-card__head">
                    <img
                        v-if="is_remote_icon(entry.icon)"
                        class="market-card__icon"
                        :src="entry.icon"
                        alt=""
                        referrerpolicy="no-referrer"
                        loading="lazy"
                    >
                    <span v-else class="market-card__icon market-card__icon--initial">{{ entry.name.slice(0, 1) }}</span>
                    <div class="market-card__heading">
                        <p class="market-card__name">{{ entry.name }}</p>
                        <p class="market-card__version mono">{{ entry.version ? "v" + entry.version : "版本未知" }}</p>
                    </div>
                </div>

                <div class="market-card__badges">
                    <Badge variant="outline">{{ type_label(entry.type) }}</Badge>
                    <span v-if="entry.installed && !entry.has_update">已安装</span>
                    <span v-if="entry.has_update" class="update-status">可更新</span>
                </div>

                <p class="market-card__desc">{{ entry.description || "暂无描述" }}</p>

                <div class="market-card__meta">
                    <span v-if="entry.authors_text" class="market-card__meta-item">
                        <Users :size="12" aria-hidden="true" class="market-card__meta-icon" />
                        <span class="market-card__meta-text">{{ entry.authors_text }}</span>
                    </span>
                    <span v-if="entry.repo" class="market-card__meta-item" :title="entry.repo">
                        <Github :size="12" aria-hidden="true" class="market-card__meta-icon" />
                        <span class="market-card__meta-text">{{ entry.repo }}</span>
                    </span>
                </div>

                <Alert v-if="entry.error" tone="danger">清单读取失败：{{ entry.error }}</Alert>

                <div class="market-card__actions">
                    <Button
                        v-if="!entry.installed"
                        variant="primary"
                        size="sm"
                        shimmer="hover"
                        :loading="isPending('market:' + entry.slug)"
                        :disabled="!entry.repo || isPending('market')"
                        @click="installMarket(entry)"
                    >安装</Button>
                    <Button
                        v-else-if="entry.has_update"
                        variant="primary"
                        size="sm"
                        shimmer="hover"
                        :loading="isPending('market:' + entry.slug)"
                        :disabled="isPending('market')"
                        @click="installMarket(entry)"
                    >更新</Button>
                    <Button
                        v-if="entry.installed"
                        variant="ghost"
                        size="sm"
                        :disabled="isPending('market:' + entry.slug) || isPending('market')"
                        @click="openUninstall(entry)"
                    >卸载</Button>
                    <Button variant="ghost" size="sm" :loading="isPending('detail:' + entry.slug)" :disabled="!entry.repo" @click="openDetail(entry)">
                        <span>详情</span>
                        <ArrowUpRight :size="12" aria-hidden="true" />
                    </Button>
                </div>
            </InspiraMagicCard>
            </Ease>
        </div>

        <!-- 卸载确认：store 里的卸载接口只发请求，是否确认由这个弹窗决定 -->
        <Dialog
            :open="uninstall_target !== null"
            :title="'卸载 ' + (uninstall_target?.name ?? '')"
            description="插件目录会被直接删除，插件数据（data/ 下同名目录）会保留。"
            @update:open="handle_uninstall_open"
        >
            <Alert tone="warn" title="此操作不可撤销">卸载后需要重新安装才能恢复，建议先备份插件配置。</Alert>
            <template #footer>
                <Button variant="ghost" @click="closeUninstall">取消</Button>
                <Button variant="danger" :loading="isPending('market:' + (uninstall_target?.slug ?? ''))" @click="confirmUninstall">确认卸载</Button>
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

.market-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
.market-card { background:var(--surface-1); border:1px solid var(--line); border-radius:6px; padding:16px; display:flex; flex-direction:column; min-width:0; gap:12px; }
.market-card__head { display:flex; gap:12px; align-items:center; }
.market-card__icon { width:40px; height:40px; flex:0 0 40px; border:1px solid var(--line); border-radius:6px; object-fit:cover; background:var(--surface-2); }
.market-card__icon--initial { display:grid; place-items:center; color:var(--fg-muted); font-size:18px; font-weight:600; }
.market-card__heading { min-width:0; }
.market-card__name { font-weight:600; font-size:15px; overflow-wrap:anywhere; }
.market-card__version { font:12px var(--font-sans); color:var(--fg-muted); margin-top:2px; }
.market-card__badges { display:flex; align-items:center; flex-wrap:wrap; gap:8px; font-size:12px; color:var(--fg-muted); }
.update-status { color:var(--accent-text); }
.market-card__desc { color:var(--fg-muted); line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; overflow-wrap:anywhere; min-height:42px; }
.market-card__meta { display:flex; flex-direction:column; gap:4px; font-size:12px; color:var(--fg-muted); }
.market-card__meta-item { display:flex; align-items:center; gap:6px; min-width:0; }
.market-card__meta-icon { flex:none; }
.market-card__meta-text { min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.market-card__actions { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:auto; padding-top:4px; }
.market-skeleton { display:grid; gap:12px; min-height:200px; }
@media(max-width:1200px) { .market-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media(max-width:600px) { .market-grid { grid-template-columns:minmax(0,1fr); } .toolbar-search { flex-basis:100%; max-width:none; } .toolbar-count { margin-left:auto; } .toolbar-spacer { display:none; } .market-card { gap:10px; } }

.toolbar { padding:12px; border:1px solid var(--line); border-radius:8px; background:var(--glass-surface); box-shadow:var(--elev-1); }
.market-grid { gap:16px; }
.market-card { position:relative; isolation:isolate; overflow:hidden; border-radius:10px; padding:20px; gap:14px; background:linear-gradient(145deg,var(--surface-1) 55%,var(--surface-2)); box-shadow:var(--elev-1); transition:border-color 180ms,box-shadow 180ms; }
.market-card::before { content:""; position:absolute; pointer-events:none; z-index:-1; inset:0; background:radial-gradient(ellipse at 100% 0%,var(--hero-middle),transparent 65%); opacity:.85; }
.market-card::after { content:""; position:absolute; inset:0 18px auto; height:1px; background:linear-gradient(90deg,transparent,var(--accent-line),transparent); pointer-events:none; }
.market-card:hover,.market-card:focus-within { border-color:var(--accent-line); box-shadow:0 8px 24px rgba(50,73,119,.12),inset 0 1px 0 var(--glass-surface); }
.market-card__icon { border-radius:10px; background:linear-gradient(135deg,var(--surface-1),var(--hero-middle)); box-shadow:0 3px 8px rgba(54,77,120,.09); }
.market-card__icon--initial { color:var(--accent-text); }
.market-card__actions { padding-top:14px; border-top:1px solid var(--line); }
.market-card__meta { gap:6px; }
@media(max-width:600px) { .market-card { padding:16px; gap:12px; } .toolbar { padding:10px; } .market-grid { gap:12px; } }


.market-card { border:1px solid transparent; border-radius:14px; background:linear-gradient(145deg,var(--surface-1),var(--surface-2)) padding-box,var(--edge-gradient) border-box; box-shadow:var(--card-shadow); }
.market-card:hover,.market-card:focus-within { box-shadow:var(--card-hover-shadow); }
.market-card__actions { gap:8px; }


@media(max-width:767px) {
 .toolbar { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px 8px; }
 .toolbar-search { grid-column:1 / -1; min-width:0; max-width:none; width:100%; }
 .toolbar-spacer { display:none; }
 .toolbar-filters { grid-column:1 / -1; justify-self:start; }
 .toolbar-count { grid-column:1; margin-left:0; font-size:13px; }
 .toolbar-refresh { grid-column:2; }
 .market-card__version,.market-card__meta,.market-card__badges { font-size:13px; }
}

</style>
