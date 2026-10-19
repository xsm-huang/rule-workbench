import type {
  ApiResponse,
  CreateSchemeInput,
  CreateSchemeResult,
  PricingMode,
  SchemeDetail,
  SchemeListResponse,
  SchemeStatus,
} from '@rule-workbench/contracts'
import http from './http'

/** 方案列表支持的更新时间排序方式。 */
export type SchemeSort = 'updatedAt:desc' | 'updatedAt:asc'

/** 列表筛选条件，由前端页面负责组织。 */
export interface SchemeFilters {
  keyword?: string
  status?: SchemeStatus
  pricingMode?: PricingMode
  ownerId?: string
  updatedFrom?: string
  updatedTo?: string
  sort?: SchemeSort
}

/** 发送给列表接口的完整查询参数。 */
export interface SchemeListQuery extends SchemeFilters {
  page: number
  pageSize: number
}

/** 分页查询方案列表。 */
export const getSchemeList = async (params: SchemeListQuery): Promise<SchemeListResponse> => {
  const { data: response } = await http.get<ApiResponse<SchemeListResponse>>(
    '/schemes/getSchemeList',
    { params },
  )

  // 保留对统一响应协议的检查，防止异常响应被当作正常数据使用。
  if (!response.success) {
    throw new Error(response.error.message)
  }

  return response.data
}

/** 根据方案 ID 获取详情。 */
export const getSchemeDetail = async (schemeId: string): Promise<SchemeDetail> => {
  // 路由参数属于外部输入，调用接口前先移除无意义的空白。
  const normalizedId = schemeId.trim()

  // 阻止空 ID 被拼成 /schemes/，避免误请求到其他接口。
  if (!normalizedId) {
    throw new Error('缺少方案 ID')
  }

  const { data: response } = await http.get<ApiResponse<SchemeDetail>>(
    // 即使当前 ID 只包含安全字符，也应正确编码动态路径参数。
    `/schemes/${encodeURIComponent(normalizedId)}`,
  )

  if (!response.success) {
    throw new Error(response.error.message)
  }

  return response.data
}

/** 创建一条新的方案草稿。 */
export const createSchemeDraft = async (input: CreateSchemeInput): Promise<CreateSchemeResult> => {
  const { data: response } = await http.post<ApiResponse<CreateSchemeResult>>(
    '/schemes/createSchemeDraft',
    input,
  )

  if (!response.success) {
    throw new Error(response.error.message)
  }

  return response.data
}
