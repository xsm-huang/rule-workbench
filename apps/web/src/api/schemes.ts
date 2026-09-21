import http from './http'

export interface SchemeListItem {
  id: string
  code: string
  name: string
  pricingMode: 'UNIT_PRICE' | 'TOTAL_POOL'
  status: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED'
  ownerName: string
  updatedAt: string
}

export interface SchemeListResponse {
  items: SchemeListItem[]
}

export const getSchemeList = async (): Promise<SchemeListResponse> => {
  const { data } = await http.get<SchemeListResponse>('/schemes')
  return data
}
