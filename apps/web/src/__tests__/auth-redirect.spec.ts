import { describe, expect, it } from 'vitest'
import { resolvePostLoginRedirect } from '@/router/auth-redirect'

describe('resolvePostLoginRedirect', () => {
  it('保留合法的站内目标地址', () => {
    // 查询参数也应保留，登录后恢复用户原来的筛选状态。
    expect(resolvePostLoginRedirect('/schemes?page=2')).toBe('/schemes?page=2')
  })

  it('拒绝完整的外部地址', () => {
    // 防止登录成功后被跳转到外部钓鱼站点。
    expect(resolvePostLoginRedirect('https://example.com')).toBe('/schemes')
  })

  it('拒绝协议相对外部地址', () => {
    // //example.com 也会被浏览器解释为外部地址。
    expect(resolvePostLoginRedirect('//example.com')).toBe('/schemes')
  })

  it('拒绝再次跳转到登录页', () => {
    // 防止出现登录页之间的重定向循环。
    expect(resolvePostLoginRedirect('/login?redirect=/login')).toBe('/schemes')
  })

  it('没有目标地址时使用默认工作台', () => {
    expect(resolvePostLoginRedirect(undefined)).toBe('/schemes')
  })
})
