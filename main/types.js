"use strict";
// LiteLoader 全局对象的最小类型建模。
// 只声明本插件真正用到的字段：完整类型要么依赖 LiteLoader 本体、要么依赖 electron，
// 而引入 electron 会额外下载上百 MB 的二进制，所以这里用结构化类型描述运行时契约。
// 清单字段（name / version / type …）来自第三方 manifest.json，无法保证类型，
// 因此这类值统一用 unknown，由使用处按需收窄，避免用 any 把检查关掉。
Object.defineProperty(exports, "__esModule", { value: true });
