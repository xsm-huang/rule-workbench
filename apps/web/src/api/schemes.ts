import http from './http'

export type SchemeStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED'
export type PricingMode = 'UNIT_PRICE' | 'TOTAL_POOL'
export type SchemeSort = 'updatedAt:desc' | 'updatedAt:asc'

export interface SchemeFilters {
  keyword?: string
  status?: SchemeStatus
  pricingMode?: PricingMode
  ownerId?: string
  updatedFrom?: string
  updatedTo?: string
  sort?: SchemeSort
}
export interface SchemeListQuery extends SchemeFilters {
  page: number
  pageSize: number
}
export interface SchemeListItem {
  id: string
  code: string
  name: string
  pricingMode: PricingMode
  status: SchemeStatus
  ownerName: string
  updatedAt: string
}

export interface PageResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type SchemeListResponse = PageResult<SchemeListItem>

export const getSchemeList = async (params: SchemeListQuery): Promise<SchemeListResponse> => {
  const { data } = await http.get<SchemeListResponse>('/schemes', { params })
  return data
}
