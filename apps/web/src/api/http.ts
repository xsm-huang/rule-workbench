import type { ApiErrorResponse } from '@rule-workbench/contracts'
import axios, { AxiosError } from 'axios'

/** 当普通业务接口返回 401 时，由应用入口注册处理函数。 */
type UnauthorizedHandler = (error: AxiosError<ApiErrorResponse>) => void
let unauthorizedHandler: UnauthorizedHandler | undefined

export const setUnauthorizedHandler = (handler: UnauthorizedHandler): void => {
  unauthorizedHandler = handler
}

// TODO 是不是可以直接返回data，而不是整个response对象
const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

/** 响应拦截 */
http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError<ApiErrorResponse>(error) && error.response?.status === 401) {
      const requestUrl = error.config?.url ?? ''

      // 登录、恢复用户和退出由 Auth Store 自己处理。
      const isAuthRequest = requestUrl.includes('/auth/')
      if (!isAuthRequest) {
        unauthorizedHandler?.(error)
      }
    }
    // 必须继续 reject，否则调用方会把失败请求当成成功请求。
    return Promise.reject(error)
  },
)

export default http
