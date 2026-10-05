import http from './http'
import type {
  ApiResponse,
  LoginInput,
  AuthUser,
  LogoutResult,
  AuthSession,
} from '@rule-workbench/contracts'

/** 从统一响应结构中取出真正的业务数据。 */
const unwraoApiResponse = <T>(response: ApiResponse<T>): T => {
  if (!response.success) throw new Error(response.error.message)

  return response.data
}

/** 使用邮箱和密码登录。 */
export const login = async (input: LoginInput): Promise<AuthSession> => {
  const { data: response } = await http.post<ApiResponse<AuthSession>>('/auth/login', input)
  return unwraoApiResponse(response)
}

/**
 * 根据浏览器当前携带的 Cookie 恢复登录用户。
 * 页面刷新时，前端内存中的用户会消失，因此需要调用该接口重新确认身份。
 */
export const getCurrentUser = async (): Promise<AuthSession> => {
  const { data: response } = await http.get<ApiResponse<AuthSession>>('/auth/me')
  return unwraoApiResponse(response)
}

/**
 * 请求服务端清除认证 Cookie。
 */
export const logout = async (): Promise<LogoutResult> => {
  const { data: response } = await http.post<ApiResponse<LogoutResult>>('/auth/logout')
  return unwraoApiResponse(response)
}
