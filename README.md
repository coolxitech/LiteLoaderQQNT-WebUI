# LiteLoaderQQNT WebUI

用浏览器管理 [LiteLoaderQQNT](https://github.com/LiteLoaderQQNT/LiteLoaderQQNT)：查看版本与路径、启停插件、浏览插件市场、检查加载器更新、编辑配置。

插件在 QQ 主进程里起一个**只监听 `127.0.0.1`** 的 HTTP 服务，前端是一个零构建的 Vue 3 单页界面（Vue 浏览器版已随仓库分发在 `webui/vendor/`，不走 npm、不走 SFC、没有打包步骤）。

## 安装

### 方式一：插件市场

在 LiteLoaderQQNT 设置页的「插件市场」里找到 **WebUI**，点安装，然后重启 QQ。

### 方式二：手动

1. 把整个仓库放进 LiteLoaderQQNT 的插件目录，目录名建议 `webui`：
   - Windows：`%USERPROFILE%/Documents/LiteLoaderQQNT/plugins/webui`
   - 设置了 `LITELOADERQQNT_PROFILE` 时：`$LITELOADERQQNT_PROFILE/plugins/webui`
2. 确认 `<插件目录>/manifest.json` 与 `<插件目录>/main/index.js` 存在。
3. 重启 QQ。

要求：LiteLoaderQQNT 版本需提供 `api.plugin.market` / `api.update`（本仓库的维护分支已提供）。缺少这些 API 时页面仍可打开，市场与更新检查会提示「当前 LiteLoader 版本不支持」。

## 打开方式

启动 QQ 后，主进程日志会打印：

```
[WebUI] 已启动：http://127.0.0.1:3210/?token=xxxxxxxx...
```

也可以在 QQ 设置 → LiteLoader → 插件 → WebUI 里点「打开」，会直接用默认浏览器打开带 token 的地址。

地址里的 token 只在首次打开时使用：页面会把它存进当前标签页的 `sessionStorage`，并从地址栏移除。之后同一标签页刷新无需再带 token，换标签页或重启浏览器则需要重新用带 token 的地址打开。

## 配置项

配置文件：`<数据目录>/webui/config.json`（一般位于 `.../LiteLoaderQQNT/data/webui/config.json`）。

| 键 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | `false` 时不启动 HTTP 服务，只在日志里留一行提示 |
| `port` | number | `3210` | 监听端口，仅绑定 `127.0.0.1` |
| `token` | string | 随机生成 | 访问令牌。留空时插件会生成 24 字节随机十六进制串并写回配置 |

token 同时会写到 `<数据目录>/webui/token`，方便脚本读取；页面本身不包含 token。

改完配置需要重启 QQ 生效。

## 功能

- **概览**：LiteLoader / QQNT / Electron / Node 版本、各路径、已加载与已安装插件数量、检查加载器更新。
- **插件**：列出已安装插件（名称、slug、版本、类型、启用状态、加载状态、平台兼容性），可启用/禁用；「标记删除」可分别勾选删除插件本体与数据目录，**下次启动 QQ 时执行**。
- **市场**：搜索、按类型筛选、刷新；卡片展示名称/描述/版本/作者/类型，可安装、更新、卸载，详情跳转 GitHub 仓库。
- **配置**：直接编辑 LiteLoader 自身的 `config.json`（`enable_plugins` / `disabled_plugins` / `deleting_plugins`），保存前校验 JSON 语法。

## 安全说明

- 服务只 `listen(port, "127.0.0.1")`，不接受外部网卡连接；端口被占用时只打日志放弃启动，不会自动换端口。
- 所有 `/api/*` 请求必须带 `X-WebUI-Token`，服务端用 `crypto.timingSafeEqual` 定长比较，缺 token 或 token 错误返回 401。
- 校验 `Host` 必须是 `127.0.0.1:<port>` 或 `localhost:<port>`；带 `Origin` 的请求必须同源，否则 403；`OPTIONS` 直接 403；**不返回任何 CORS 头**。
- 静态资源路径 resolve 后必须仍在 `webui/` 目录内，含 `..` 的路径直接 404；请求体上限 1MB。
- `/api/open` 的 `url` 只允许 `https://`，`path` 必须位于插件目录或数据目录内。
- 令牌等同于本机管理权限：不要截图外发、不要写进脚本仓库，怀疑泄露时清空配置里的 `token` 并重启 QQ 重新生成。

## 目录结构

```
manifest.json          插件清单（injects.main / injects.renderer）
main/index.js          HTTP 服务 + API（CommonJS，跑在 QQ 主进程）
webui/renderer.js      QQ 设置页里的 WebUI 地址行（ESM）
webui/index.html       WebUI 页面外壳
webui/app.js           Vue 3 单页应用（ESM，模板字符串，无 SFC）
webui/styles.css       自带浅色主题，不依赖 QQ 的 CSS 变量
webui/vendor/          Vue 浏览器版（随仓库分发）
```

## HTTP API

除静态资源外，所有接口都需要 `X-WebUI-Token`。成功返回 `{ "ok": true, "data": ... }`，失败返回 `{ "ok": false, "message": "..." }`。

| 方法与路径 | 说明 |
| --- | --- |
| `GET /api/status` | `{ versions, path, loaded, installed }` |
| `GET /api/plugins` | 插件数组，每项 `{ slug, name, version, type, enabled, loaded, incompatible }` |
| `POST /api/plugins/:slug/enable` | body `{ enabled }` |
| `POST /api/plugins/:slug/delete` | body `{ self, data }`，下次启动生效 |
| `GET /api/market?refresh=1` | 插件市场列表（透传 `market.list`） |
| `POST /api/market/install` | body `{ slug, url }` |
| `POST /api/market/uninstall` | body `{ slug, removeData }` |
| `GET /api/update?refresh=1` | 检查加载器更新 |
| `GET /api/config` / `PUT /api/config` | 读取 / 覆盖 LiteLoader 配置 |
| `POST /api/open` | body `{ kind: "url" \| "path", value }` |

## 开发

无构建、无依赖、无测试框架。改完直接重启 QQ 即生效。

```powershell
# 语法检查
node --check main/index.js
node --check webui/renderer.js
node --check webui/app.js
```

`webui/app.js` 用的是 Vue 浏览器版（`vue.esm-browser.prod.js`，含模板编译器），因此可以直接写 `template` 字符串。升级 Vue 时替换 `webui/vendor/vue.esm-browser.prod.js` 即可，不需要任何构建步骤。

## 许可证

[MIT](LICENSE) © coolxitech
