import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { AuthUser } from '@rule-workbench/contracts'

import * as authApi from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

/**
 * 测试 Store 时不发送真实 HTTP 请求，
 * 而是模拟认证 API 的返回结果。
 */
vi.mock('@/api/auth', () => ({
  // 复用真实 login 函数的参数与返回值类型。
  login: vi.fn<typeof authApi.login>(),

  // 确保 Mock 必须返回 Promise<AuthUser>。
  getCurrentUser: vi.fn<typeof authApi.getCurrentUser>(),

  // 确保 Mock 的退出结果与真实 API 保持一致。
  logout: vi.fn<typeof authApi.logout>(),
}))

const mockedAuthApi = vi.mocked(authApi)

const editorUser: AuthUser = {
  id: 'user-editor',
  email: 'editor@example.com',
  displayName: '李编辑',
  role: 'EDITOR',
}

describe('auth store', () => {
  beforeEach(() => {
    // 每个测试使用新的 Pinia，避免状态相互污染。
    setActivePinia(createPinia())

    // 清除上一个测试留下的 Mock 调用记录。
    vi.clearAllMocks()
  })

  it('登录成功后保存当前用户', async () => {
    mockedAuthApi.login.mockResolvedValue(editorUser)

    const authStore = useAuthStore()

    await authStore.login({
      email: 'editor@example.com',
      password: 'Editor123',
    })

    expect(authStore.user).toEqual(editorUser)
    expect(authStore.status).toBe('loggedIn')
    expect(authStore.isLoggedIn).toBe(true)
  })

  it('可以通过 /auth/me 恢复用户', async () => {
    mockedAuthApi.getCurrentUser.mockResolvedValue(editorUser)

    const authStore = useAuthStore()
    const restored = await authStore.restoreSession()

    expect(restored).toBe(true)
    expect(authStore.user).toEqual(editorUser)
    expect(authStore.status).toBe('loggedIn')
  })

  it('恢复用户失败后进入未登录状态', async () => {
    mockedAuthApi.getCurrentUser.mockRejectedValue(new Error('Unauthorized'))

    const authStore = useAuthStore()
    const restored = await authStore.restoreSession()

    expect(restored).toBe(false)
    expect(authStore.user).toBeNull()
    expect(authStore.status).toBe('loggedOut')
  })

  it('退出成功后清空当前用户', async () => {
    mockedAuthApi.login.mockResolvedValue(editorUser)
    mockedAuthApi.logout.mockResolvedValue({
      loggedOut: true,
    })

    const authStore = useAuthStore()

    await authStore.login({
      email: 'editor@example.com',
      password: 'Editor123',
    })

    await authStore.logout()

    expect(authStore.user).toBeNull()
    expect(authStore.status).toBe('loggedOut')
    expect(authStore.isLoggedIn).toBe(false)
  })
})
