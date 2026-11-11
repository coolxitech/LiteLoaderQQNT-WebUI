// 渲染进程侧的 LiteLoader 接口建模：只声明设置页用到的 config.get 与 openExternal。
// 这些 API 由 preload 通过 contextBridge 暴露，全部返回 Promise；具体实现在 LiteLoader 本体，
// 本插件不依赖它的类型包，所以在这里按运行时契约本地声明。
export {};
