import { describe, expect, it } from 'vitest'
import { isForbiddenError, isUnauthorizedError } from '@/api/error'

const createAxiosError = (status: number): unknown => ({
  // axios.isAxiosError 使用这个标记识别 Axios 错误。
  isAxiosError: true,
  response: { status },
})

describe('API status helpers', () => {
  it('只把 401 识别为认证失效', () => {
    expect(isUnauthorizedError(createAxiosError(401))).toBe(true)
    expect(isUnauthorizedError(createAxiosError(403))).toBe(false)
    expect(isUnauthorizedError(new Error('普通错误'))).toBe(false)
  })

  it('只把 403 识别为无权限', () => {
    expect(isForbiddenError(createAxiosError(403))).toBe(true)
    expect(isForbiddenError(createAxiosError(401))).toBe(false)
    expect(isForbiddenError(new Error('普通错误'))).toBe(false)
  })
})
