const DEFAULT_LOGGEDIN_PATH = '/schemes'

/**
 * 从路由查询参数中获取安全的站内回跳地址。
 */
export const resolvePostLoginRedirect = (value: unknown): string => {
  const redirect = Array.isArray(value) ? value[0] : value
  if (typeof redirect !== 'string') {
    return DEFAULT_LOGGEDIN_PATH
  }

  // 只接受以单个 / 开头的站内绝对路径
  if (!redirect.startsWith('/') || redirect.startsWith('//')) {
    return DEFAULT_LOGGEDIN_PATH
  }

  // 避免把用户再次跳回登录页，形成登录页循环。
  if (redirect === '/login' || redirect.startsWith('/login?') || redirect.startsWith('/login#')) {
    return DEFAULT_LOGGEDIN_PATH
  }

  return redirect
}
