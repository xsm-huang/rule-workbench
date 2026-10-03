import type { WorkbenchBootstrap } from '@rule-workbench/contracts'
import http from './http'
import type { ApiResponse } from '@rule-workbench/contracts'

/** 工作台初始化接口查询 */
export async function getWorkbenchBootstrap(): Promise<WorkbenchBootstrap> {
  const { data: response } = await http.get<ApiResponse<WorkbenchBootstrap>>('/workbench/bootstrap')

  if (!response.success) {
    throw new Error(response.error.message)
  }
  return response.data
}
