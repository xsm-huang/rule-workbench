import { useAuthStore } from '@/stores/auth.ts'
import { pinia } from '@/stores/index.ts'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { resolvePostLoginRedirect } from './auth-redirect.ts'
import { WORKBENCH_PERMISSIONS, type WorkbenchPermission } from '@rule-workbench/contracts'
import { AUTH_SESSION_QUERY_KEY, queryClient } from '@/queries/query-client.ts'
import { getCurrentUser } from '@/api/auth.ts'

/**
 * 扩展 Vue Router 的路由元信息类型。
 */
declare module 'vue-router' {
  interface RouteMeta {
    /**
     * 不写时默认是 protected，即必须登录。
     *
     * public：任何人都能访问。
     * guest：仅未登录用户能访问。
     * protected：可显式标记，但通常无需写。
     */
    access?: 'public' | 'guest' | 'protected'
    /** 进入整个页面前必须拥有的业务权限。 */
    requiredPermission?: WorkbenchPermission
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/schemes', // 根路径统一进入业务页，再由路由守卫判断是否需要登录。
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { access: 'guest' },
  },
  {
    path: '/schemes',
    component: () => import('../views/WorkbenchView.vue'),
    children: [
      {
        path: '',
        name: 'schemes',
        component: () => import('../views/schemes/SchemeWorkbench.vue'),
      },
      {
        path: 'new',
        name: 'scheme-new',
        component: () => import('../views/schemes/SchemeEditorView.vue'),
        meta: { requiredPermission: WORKBENCH_PERMISSIONS.SCHEME_CREATE },
      },
    ],
  },
  // 403页面
  {
    path: '/forbidden',
    name: 'forbidden',
    component: () => import('../components/ForbiddenState.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

/**
 * 全局前置守卫
 */
router.beforeEach(async (to) => {
  const authStore = useAuthStore(pinia)
  // 首次打开应用时获取用户信息
  if (authStore.status === 'unknown' || authStore.status === 'loading') {
    await authStore.restoreSession()
  }

  const access = to.meta.access ?? 'protected'
  // 未登录用户访问受保护页面
  if (access === 'protected' && !authStore.isLoggedIn) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
      replace: true,
    }
  }

  // 已登录用户再次打开登录页时，直接进入业务页面。
  if (to.meta.access === 'guest' && authStore.isLoggedIn) {
    return resolvePostLoginRedirect(to.query.redirect)
  }

  const requiredPermission = to.meta.requiredPermission
  if (requiredPermission && !authStore.hasPermission(requiredPermission)) {
    return { name: 'forbidden', replace: false }
  }

  return true
})

export default router
