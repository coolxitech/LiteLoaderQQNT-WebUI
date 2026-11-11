import { createApp } from "vue";
import "animate.css";
// 令牌必须在基础样式之前，base.css 里会引用这些变量
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/refined.css";
import App from "./App.vue";
import { setTheme, theme } from "./store";

// 把 store 里的主题同步到 <html data-theme>，与 index.html 的内联脚本保持一致
setTheme(theme.value);
createApp(App).mount("#app");
