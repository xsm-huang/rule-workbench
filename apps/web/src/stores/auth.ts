import type { LoginInput, AuthUser, WorkbenchPermission } from '@rule-workbench/contracts'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authApi from '@/api/auth'
import { isUnauthorizedError } from '@/api/error'
import { queryClient } from '@/queries/query-client'

/**
 * unknown - 未知
 * loading - 登录中
 * loggedIn - 已登录
 * loggedOut - 未登录
 */
export type AuthStatus = 'unknown' | 'loading' | 'loggedIn' | 'loggedOut'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const permissions = ref<WorkbenchPermission[]>([])
  const status = ref<AuthStatus>('unknown')

  /** 保存正在进行的请求。 */
  let restorePromise: Promise<boolean> | null = null

  const isLoggedIn = computed(() => {
    return status.value === 'loggedIn' && user.value !== null
  })

  /** 将状态更新为已登录。 */
  const setLoggedInUser = (
    loggedInUser: AuthUser,
    userPermissions: WorkbenchPermission[] = [],
  ): void => {
    user.value = loggedInUser
    status.value = 'loggedIn'
    permissions.value = userPermissions
  }

  /**  清除前端内存中的认证状态。 */
  const clearSession = (): void => {
    user.value = null
    status.value = 'loggedOut'
    permissions.value = []
  }

  /** 登录 */
  const login = async (input: LoginInput): Promise<AuthUser> => {
    const session = await authApi.login(input)
    setLoggedInUser(session.user, session.permissions)
    return session.user
  }

  /** 页面启动或首次进入路由时，根据 Cookie 恢复用户。 */
  const restoreSession = (): Promise<boolean> => {
    if (status.value === 'loggedIn') {
      return Promise.resolve(true)
    }
    if (status.value === 'loggedOut') {
      return Promise.resolve(false)
    }

    if (restorePromise) {
      return restorePromise
    }

    status.value = 'loading'
    restorePromise = authApi
      .getCurrentUser()
      .then((currentUser) => {
        setLoggedInUser(currentUser.user, currentUser.permissions)
        return true
      })
      .catch(() => {
        clearSession()
        return false
      })
      .finally(() => {
        restorePromise = null
      })

    return restorePromise
  }

  /** 登出 */
  const logout = async (): Promise<void> => {
    try {
      await authApi.logout()
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        throw error
      }
    } finally {
      await queryClient.cancelQueries() // 停止还在请求的接口
      queryClient.clear() // 清空缓存

      clearSession()
    }
  }

  /** 判断是否有权限 */
  const hasPermission = (permission: WorkbenchPermission): boolean => {
    console.log(permissions.value.includes(permission), '11111111', permission, permissions)

    return permissions.value.includes(permission)
  }

  return {
    user,
    status,
    permissions,
    isLoggedIn,
    login,
    logout,
    restoreSession,
    clearSession,
    hasPermission,
  }
})
