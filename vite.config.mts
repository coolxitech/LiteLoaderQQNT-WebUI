import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// 源码在 webui-src/，构建产物落到 webui/（由 main/index.js 作为静态根直接服务）
// package.json 没有 "type": "module"，Vite 会自己转译配置文件，所以这里用 .ts 而不是 .mjs
export default defineConfig({
    root: "webui-src",
    // 产物用相对路径引用 assets，服务挂在 / 下也能正常加载
    base: "./",
    plugins: [vue()],
    build: {
        outDir: "../webui",
        emptyOutDir: true,
        // 固定浏览器目标，避免默认目标把媒体查询降级成 width<=720px 这类新语法，
        // 保证和老版本浏览器（Chrome 100 上下）打开也正常
        target: "chrome100",
        cssTarget: "chrome100"
    }
});
