import type { ApiErrorResponse } from '@rule-workbench/contracts'
import axios from 'axios'

/** 尝试从 Axios 错误中读取后端统一错误响应。 */
const getApiErrorResponse = (error: unknown): ApiErrorResponse | undefined => {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) {
    return undefined
  }

  const responseBody = error.response?.data

  if (!responseBody || responseBody.success !== false) {
    return undefined
  }

  return responseBody
}

/** 获取适合显示给用户的错误消息。 */
export const getApiErrorMessage = (error: unknown, fallbackMessaga: string): string => {
  const apiError = getApiErrorResponse(error)
  if (apiError) {
    return apiError.error.message
  }

  // Axios 的默认英文错误一般不适合直接展示，因此只处理普通 Error。
  if (error instanceof Error && !axios.isAxiosError(error)) {
    return error.message
  }

  return fallbackMessaga
}

/** 判断一次请求是否因为认证失效而返回 401。 */
export const isUnauthorizadError = (error: unknown): boolean => {
  return axios.isAxiosError(error) && error.response?.status === 401
}
