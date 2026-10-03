import { createApp } from 'vue'
import '@/styles/index.scss'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { queryClient } from '@/queries/query-client.ts'
import { pinia } from '@/stores'
import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from './api/http.ts'
import { useAuthStore } from './stores/auth.ts'

const app = createApp(App)

app.use(pinia)

const authStore = useAuthStore(pinia)
// 避免模块循环依赖，不直接写在http，而是使用回调实现
setUnauthorizedHandler(() => {
  const currentRoute = router.currentRoute.value
  authStore.clearSession()
  if (currentRoute.name === 'login') {
    return
  }
  void router.replace({
    name: 'login',
    query: { redirect: currentRoute.fullPath },
  })
})

app.use(router)
app.use(ElementPlus)
app.use(VueQueryPlugin, { queryClient }) // 全局使用同一个实例
app.mount('#app')
