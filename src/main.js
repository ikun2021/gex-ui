import { createApp } from 'vue'
import 'element-plus/dist/index.css'
import 'virtual:windi.css'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import router from '@/router'
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import { createPersistedState } from 'pinia-plugin-persistedstate';
import App from './App.vue'
const app = createApp(App)
app.use(router)

app.use(ElementPlus, {
    locale: zhCn,
})

// pinia
import { createPinia } from 'pinia'
const pinia = createPinia()
// 持久化存储
pinia.use(
    createPersistedState({
        auto: true, // 启用所有 Store 默认持久化
    }),
);

// 重写 $reset 方法 => 解决组合式api中无法使用问题
pinia.use(({ store }) => {
    const initialState = JSON.parse(JSON.stringify(store.$state));
    store.$reset = () => {
        store.$patch(initialState);
    }
})
app.use(pinia)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}

app.mount('#app')
