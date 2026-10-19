import { afterEach, describe, expect, it, vi } from 'vitest'
import { USER_ROLES, WORKBENCH_PERMISSIONS } from '@rule-workbench/contracts'
import { pinia } from '@/stores'
import { useAuthStore } from '@/stores/auth'

import router from '../router'

describe('application routes', () => {
  it.each(['/login', '/schemes'])('resolves route %s', (path) => {
    const resolvedRoute = router.resolve(path)

    expect(resolvedRoute.matched.length).toBeGreaterThan(0)
  })

  it('将已有方案编辑地址解析到受编辑权限保护的页面', () => {
    const route = router.resolve('/schemes/scheme-1/edit')

    expect(route.name).toBe('scheme-edit')
    expect(route.params.id).toBe('scheme-1')
    expect(route.meta.requiredPermission).toBe(WORKBENCH_PERMISSIONS.SCHEME_EDIT)
  })
})

describe('编辑页路由权限', () => {
  const auth = useAuthStore(pinia)

  afterEach(() => {
    auth.clearSession()
    vi.restoreAllMocks()
  })

  it('未登录访问编辑地址时跳转登录，并保留目标地址', async () => {
    auth.clearSession()
    await router.push('/schemes/scheme-1/edit')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/schemes/scheme-1/edit')
  })

  it.each([
    { role: USER_ROLES.VIEWER, permissions: [], destination: 'forbidden' },
    {
      role: USER_ROLES.REVIEWER,
      permissions: [WORKBENCH_PERMISSIONS.SCHEME_REVIEW],
      destination: 'forbidden',
    },
    {
      role: USER_ROLES.EDITOR,
      permissions: [WORKBENCH_PERMISSIONS.SCHEME_EDIT],
      destination: 'scheme-edit',
    },
  ])('$role 访问编辑地址时进入 $destination', async ({ role, permissions, destination }) => {
    auth.user = { id: 'user-1', email: 'test@example.com', displayName: '测试用户', role }
    auth.status = 'loggedIn'
    auth.permissions = permissions
    // 屏蔽权限 Store 中已有的调试日志，保留测试输出可读性。
    vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await router.push('/schemes/scheme-1/edit')

    expect(router.currentRoute.value.name).toBe(destination)
  })
})
